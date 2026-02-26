import pino from 'pino';
import { configManager } from '../config';

const isDev = configManager.isDevelopment();
const isTest = configManager.isTest();

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: { service: 'mini-mt', env: configManager.getConfig().nodeEnv },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.refreshToken',
        'body.accessToken',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    // Suppress all logs during tests
    ...(isTest && { level: 'silent' }),
  },
  isDev && !isTest
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:mm:ss',
          ignore: 'pid,hostname,service,env',
          messageFormat: '{msg}',
        },
      })
    : undefined,
);