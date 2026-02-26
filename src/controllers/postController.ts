import { Request, Response } from 'express';
import { dbManager } from '../services/dbManager';
import { formatZodError } from '../middleware/validation';
import {
  createPostSchema,
  updatePostSchema,
  postIdParamSchema,
  CreatePostInput,
  UpdatePostInput,
  PostIdParam,
} from '../utils/validation';

// GET /posts — list all posts scoped to current tenant
export const getAllPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const prisma = dbManager.getClient();

    const posts = await prisma.post.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// GET /posts/:id — get single post scoped to current tenant
export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = postIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json(formatZodError(paramsValidation.error));
      return;
    }

    const { id }: PostIdParam = paramsValidation.data;
    const tenantId = req.tenantId!;
    const prisma = dbManager.getClient();

    // @@unique([id, tenantId]) enforces tenant isolation at DB level too
    const post = await prisma.post.findFirst({
      where: { id, tenantId },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// POST /posts — create post in current tenant, authored by current user
export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const bodyValidation = createPostSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json(formatZodError(bodyValidation.error));
      return;
    }

    const { title, content, published }: CreatePostInput = bodyValidation.data;
    const tenantId = req.tenantId!;
    const authorId = req.user!.id;
    const prisma = dbManager.getClient();

    // Ensure the author is a member of this tenant
    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: authorId, tenantId } },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this tenant' });
      return;
    }

    const post = await prisma.post.create({
      data: { title, content, published, authorId, tenantId },
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// PUT /posts/:id — update post, only author or admin can update
export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = postIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json(formatZodError(paramsValidation.error));
      return;
    }

    const bodyValidation = updatePostSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json(formatZodError(bodyValidation.error));
      return;
    }

    const { id }: PostIdParam = paramsValidation.data;
    const data: UpdatePostInput = bodyValidation.data;
    const tenantId = req.tenantId!;
    const currentUser = req.user!;
    const prisma = dbManager.getClient();

    const post = await prisma.post.findFirst({
      where: { id, tenantId },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Only the author or an admin can update
    if (post.authorId !== currentUser.id && currentUser.role !== 'ADMIN') {
      res.status(403).json({ error: 'You do not have permission to update this post' });
      return;
    }

    const updated = await prisma.post.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        updatedAt: true,
        author: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({ post: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' });
  }
};

// DELETE /posts/:id — delete post, only author or admin can delete
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = postIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json(formatZodError(paramsValidation.error));
      return;
    }

    const { id }: PostIdParam = paramsValidation.data;
    const tenantId = req.tenantId!;
    const currentUser = req.user!;
    const prisma = dbManager.getClient();

    const post = await prisma.post.findFirst({
      where: { id, tenantId },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Only the author or an admin can delete
    if (post.authorId !== currentUser.id && currentUser.role !== 'ADMIN') {
      res.status(403).json({ error: 'You do not have permission to delete this post' });
      return;
    }

    await prisma.post.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};