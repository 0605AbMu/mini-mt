import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { getAllUsers, createUser } from '../controllers/userController';

const router: Router = Router();

// User routes (Admin only)
router.get('/', requireAdmin, getAllUsers);

// This route is now deprecated - use /auth/register instead
router.post('/', requireAdmin, createUser);

export default router;