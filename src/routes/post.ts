import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController';

const router: Router = Router();

// All post routes require:
//   1. Valid JWT session (requireAuth)
//   2. Valid X-Tenant-Id header (tenantMiddleware) — mandatory, not optional
router.use(requireAuth, tenantMiddleware);

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

export default router;