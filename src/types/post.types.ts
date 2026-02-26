import { z } from 'zod';

// Post creation schema — tenantId comes from X-Tenant-Id header, not body
export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  content: z
    .string()
    .max(10000, 'Content must be less than 10000 characters')
    .optional()
    .nullable(),
  published: z.boolean().optional().default(false),
});

// Post update schema — all fields optional
export const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim()
    .optional(),
  content: z
    .string()
    .max(10000, 'Content must be less than 10000 characters')
    .optional()
    .nullable(),
  published: z.boolean().optional(),
});

// Post ID param schema
export const postIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Post ID must be a valid number')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'Post ID must be a positive number'),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostIdParam = z.infer<typeof postIdParamSchema>;