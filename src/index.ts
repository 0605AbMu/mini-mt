import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import tenantRoutes from './routes/tenant';
import postRoutes from './routes/post';
import { dbManager } from './services/dbManager';
import { logger } from './services/logger';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Id'],
}));

// Import global rate limiter from middleware and config
import { configManager } from './config';
import { globalLimiter } from './middleware/rateLimiter';

// HTTP request logger
app.use(pinoHttp({
  logger,
  customLogLevel: (_req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) =>
    `${req.method} ${req.url} ${res.statusCode}`,
  // Skip health check logs to reduce noise
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
}));

// Apply global rate limiter only in production
if (configManager.isProduction()) {
  app.use(globalLimiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Import tenant middleware
import { optionalTenantMiddleware } from './middleware/tenantMiddleware';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', optionalTenantMiddleware, tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Import error handlers
import { globalErrorHandler, notFoundHandler } from './utils/errorHandler';

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully');
  try {
    await dbManager.disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

export default app;