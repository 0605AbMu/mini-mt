import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  addUserToTenant,
  removeUserFromTenant
} from '../controllers/tenantController';

const router: Router = Router();

// Tenant routes (Admin only)
router.get('/', requireAdmin, getAllTenants);
router.get('/:id', requireAdmin, getTenantById);
router.post('/', requireAdmin, createTenant);
router.put('/:id', requireAdmin, updateTenant);
router.delete('/:id', requireAdmin, deleteTenant);

// User-Tenant relationship routes (Admin only)
router.post('/users', requireAdmin, addUserToTenant);
router.delete('/:tenantId/users/:userId', requireAdmin, removeUserFromTenant);

export default router;