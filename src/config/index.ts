import dotenv from "dotenv";

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

export interface AppConfig {
  // Server Configuration
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];

  // Database Configuration
  databaseUrl: string;

  // JWT Configuration
  jwt: {
    secret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };

  // Session Configuration
  session: {
    maxActiveSessions: number;
    cleanupIntervalMs: number;
    extendOnActivity: boolean;
  };

  // Security Configuration
  security: {
    bcryptSaltRounds: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.validateEnvironment();
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private validateEnvironment(): void {
    const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`,
      );
    }
  }

  private loadConfig(): AppConfig {
    return {
      // Server Configuration
      port: parseInt(process.env.PORT || "3000", 10),
      nodeEnv: process.env.NODE_ENV || "development",
      allowedOrigins: (
        process.env.ALLOWED_ORIGINS || "http://localhost:3000"
      ).split(","),

      // Database Configuration
      databaseUrl: process.env.DATABASE_URL!,

      // JWT Configuration
      jwt: {
        secret: process.env.JWT_SECRET!,
        accessTokenExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
        refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      },

      // Session Configuration
      session: {
        maxActiveSessions: parseInt(process.env.MAX_ACTIVE_SESSIONS || "5", 10),
        cleanupIntervalMs: parseInt(
          process.env.SESSION_CLEANUP_INTERVAL_MS || "3600000",
          10,
        ), // 1 hour
        extendOnActivity: process.env.EXTEND_SESSION_ON_ACTIVITY !== "false",
      },

      // Security Configuration
      security: {
        bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "14", 10),
        rateLimitWindowMs: parseInt(
          process.env.RATE_LIMIT_WINDOW_MS || "900000",
          10,
        ), // 15 minutes
        rateLimitMaxRequests: parseInt(
          process.env.RATE_LIMIT_MAX_REQUESTS || "100",
          10,
        ),
      },
    };
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === "development";
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === "production";
  }

  public isTest(): boolean {
    return this.config.nodeEnv === "test";
  }
}

export const configManager = ConfigManager.getInstance();
export const config = configManager.getConfig();
