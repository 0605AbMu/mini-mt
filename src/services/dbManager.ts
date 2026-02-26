import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from './logger';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;

  private constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    this.prisma = new PrismaClient({
      adapter,
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected');
    } catch (error) {
      logger.error({ err: error }, 'Database connection failed');
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error({ err: error }, 'Database disconnection failed');
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error({ err: error }, 'Database health check failed');
      return { status: 'unhealthy', timestamp: new Date().toISOString() };
    }
  }

  public async executeTransaction<T>(
    operations: (prisma: any) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await operations(tx);
    });
  }

  public async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }
    
    try {
      // Get all table names
      const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      // Disable foreign key checks
      await this.prisma.$executeRaw`SET session_replication_role = replica;`;

      // Truncate all tables
      for (const table of tables) {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table.tablename}" CASCADE;`);
      }

      // Re-enable foreign key checks
      await this.prisma.$executeRaw`SET session_replication_role = DEFAULT;`;

      logger.info('Database reset completed');
    } catch (error) {
      logger.error({ err: error }, 'Database reset failed');
      throw error;
    }
  }

  public async seedDatabase(): Promise<void> {
    try {
      await this.prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
          email: 'admin@example.com',
          name: 'Admin User',
          password: '$2a$10$example.hash',
          role: 'ADMIN',
        },
      });

      logger.info('Database seeded');
    } catch (error) {
      logger.error({ err: error }, 'Database seeding failed');
      throw error;
    }
  }

  public async getStats(): Promise<{
    users: number;
    connections: number;
    uptime: string;
  }> {
    try {
      const [userCount] = await Promise.all([
        this.prisma.user.count(),
      ]);

      return {
        users: userCount,
        connections: 1, // Prisma connection pool info is not directly accessible
        uptime: process.uptime().toString(),
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get database stats');
      throw error;
    }
  }
}

export const dbManager = DatabaseManager.getInstance();