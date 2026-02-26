import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { optionalTenantMiddleware } from '../middleware/tenantMiddleware';
import { getAllUsers, createUser } from '../controllers/userController';

const router: Router = Router();

// User routes (Admin only) - with optional tenant context
router.get('/', requireAdmin, optionalTenantMiddleware, getAllUsers);

// This route is now deprecated - use /auth/register instead
router.post('/', requireAdmin, createUser);

export default router;