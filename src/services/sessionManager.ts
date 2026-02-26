import { SessionStatus } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SessionJwtPayload } from '../middleware/auth';
import { config } from '../config';
import { dbManager } from './dbManager';

export interface SessionData {
  id: string;
  userId: number;
  status: SessionStatus;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

export interface CreateSessionOptions {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

export class SessionManager {
  private static instance: SessionManager;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session with access and refresh tokens
   */
  public async createSession(options: CreateSessionOptions): Promise<TokenPair> {
    const prisma = dbManager.getClient();
    const { userId, ipAddress, userAgent, deviceInfo } = options;

    // Check if user has too many active sessions
    await this.enforceSessionLimit(userId);

    // Generate unique refresh token
    const refreshToken = this.generateRefreshToken();
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + this.parseTimeToMs(config.jwt.refreshTokenExpiresIn));

    // Create session in database
    const session = await prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
        deviceInfo,
        status: SessionStatus.ACTIVE,
      },
    });

    // Generate access token with session ID
    const accessToken = this.generateAccessToken(userId, session.id);

    // Update session with access token
    await prisma.session.update({
      where: { id: session.id },
      data: { accessToken },
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Validate and refresh an access token using refresh token
   */
  public async refreshSession(refreshToken: string): Promise<TokenPair | null> {
    const prisma = dbManager.getClient();

    // Find session by refresh token
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.status !== SessionStatus.ACTIVE) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.invalidateSession(session.id);
      return null;
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken(session.userId, session.id);
    
    // Update session with new access token and last activity
    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        lastActivity: new Date(),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: session.refreshToken,
      sessionId: session.id,
      expiresAt: updatedSession.expiresAt,
    };
  }

  /**
   * Validate a session by ID
   */
  public async validateSession(sessionId: string): Promise<SessionData | null> {
    const prisma = dbManager.getClient();

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== SessionStatus.ACTIVE) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Update last activity if configured
    if (config.session.extendOnActivity) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActivity: new Date() },
      });
    }

    return {
      id: session.id,
      userId: session.userId,
      status: session.status,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      deviceInfo: session.deviceInfo || undefined,
    };
  }

  /**
   * Invalidate a specific session
   */
  public async invalidateSession(sessionId: string): Promise<void> {
    const prisma = dbManager.getClient();

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.REVOKED },
    });
  }

  /**
   * Invalidate all sessions for a user
   */
  public async invalidateAllUserSessions(userId: number): Promise<void> {
    const prisma = dbManager.getClient();

    await prisma.session.updateMany({
      where: { 
        userId,
        status: SessionStatus.ACTIVE,
      },
      data: { status: SessionStatus.REVOKED },
    });
  }

  /**
   * Get all active sessions for a user
   */
  public async getUserSessions(userId: number): Promise<SessionData[]> {
    const prisma = dbManager.getClient();

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      orderBy: { lastActivity: 'desc' },
    });

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      status: session.status,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      deviceInfo: session.deviceInfo || undefined,
    }));
  }

  /**
   * Clean up expired sessions
   */
  public async cleanupExpiredSessions(): Promise<number> {
    const prisma = dbManager.getClient();

    const result = await prisma.session.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: SessionStatus.ACTIVE,
      },
      data: { status: SessionStatus.EXPIRED },
    });

    return result.count;
  }

  /**
   * Enforce session limit per user
   */
  private async enforceSessionLimit(userId: number): Promise<void> {
    const prisma = dbManager.getClient();
    const maxSessions = config.session.maxActiveSessions;

    const activeSessions = await prisma.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      orderBy: { lastActivity: 'asc' },
    });

    if (activeSessions.length >= maxSessions) {
      // Revoke oldest sessions
      const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - maxSessions + 1);
      
      await prisma.session.updateMany({
        where: {
          id: { in: sessionsToRevoke.map(s => s.id) },
        },
        data: { status: SessionStatus.REVOKED },
      });
    }
  }

  /**
   * Generate access token with session ID
   */
  private generateAccessToken(userId: number, sessionId: string): string {
    const payload: SessionJwtPayload = {
      userId,
      sessionId,
      type: 'access',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Generate secure refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Parse time string to milliseconds
   */
  private parseTimeToMs(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  /**
   * Start automatic cleanup of expired sessions
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        const cleaned = await this.cleanupExpiredSessions();
        if (cleaned > 0) {
          console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
        }
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, config.session.cleanupIntervalMs);
  }

  /**
   * Stop cleanup interval
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const sessionManager = SessionManager.getInstance();