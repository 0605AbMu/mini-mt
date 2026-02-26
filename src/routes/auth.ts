import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { 
  register, 
  login, 
  getCurrentUser, 
  refreshToken, 
  logout, 
  logoutAll, 
  getUserSessions 
} from '../controllers/authController';
import { registerLimiter, loginLimiter, authLimiter } from '../middleware/rateLimiter';
import { configManager } from '../config';

const router: Router = Router();

// Helper function to conditionally apply rate limiter only in production
const applyRateLimiter = (limiter: any) => {
  return configManager.isProduction() ? limiter : (req: any, res: any, next: any) => next(); 
};

// Register endpoint with rate limiting
router.post('/register', applyRateLimiter(registerLimiter), register);

// Login endpoint with rate limiting
router.post('/login', applyRateLimiter(loginLimiter), login);

// Refresh token endpoint
router.post('/refresh', applyRateLimiter(authLimiter), refreshToken);

// Logout endpoint
router.post('/logout', applyRateLimiter(authLimiter), logout);

// Logout from all devices (requires authentication)
router.post('/logout-all', applyRateLimiter(authLimiter), requireAuth, logoutAll);

// Get current user profile (requires authentication)
router.get('/me', applyRateLimiter(authLimiter), requireAuth, getCurrentUser);

// Get user sessions (requires authentication)
router.get('/sessions', applyRateLimiter(authLimiter), requireAuth, getUserSessions);

export default router;