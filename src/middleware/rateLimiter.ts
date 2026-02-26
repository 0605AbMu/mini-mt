import rateLimit from 'express-rate-limit';

// Base rate limiter configuration following DRY principles
const createRateLimiter = (
  windowMs: number,
  max: number,
  errorMessage: string,
  skipSuccessfulRequests = false,
  skipFailedRequests = false
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: errorMessage,
      retryAfter: windowMs,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
  });
};

// Global rate limiter - 2 requests max
export const globalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  2, // limit each IP to 2 requests per windowMs
  'Too many requests from this IP, please try again after 15 minutes.'
);

// Auth-specific rate limiter - 2 requests max
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  2, // limit each IP to 2 auth requests per windowMs
  'Too many authentication attempts from this IP, please try again after 15 minutes.'
);

// Login-specific rate limiter - 2 requests max
export const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  2, // limit each IP to 2 login attempts per windowMs
  'Too many login attempts from this IP, please try again after 15 minutes.',
  true, // Don't count successful logins
  false // Count failed login attempts
);

// Registration rate limiter - 2 requests max
export const registerLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  2, // limit each IP to 2 registration attempts per hour
  'Too many registration attempts from this IP, please try again after 1 hour.'
);

// Password reset rate limiter - 2 requests max
export const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  2, // limit each IP to 2 password reset attempts per hour
  'Too many password reset attempts from this IP, please try again after 1 hour.'
);