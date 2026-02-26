import { z } from 'zod';

// Tenant creation validation schema
export const createTenantSchema = z.object({
  name: z
    .string()
    .min(1, 'Tenant name is required')
    .max(100, 'Tenant name must be less than 100 characters')
    .trim(),
  slug: z
    .string()
    .min(1, 'Tenant slug is required')
    .max(50, 'Tenant slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Tenant slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable()
});

// Tenant update validation schema
export const updateTenantSchema = z.object({
  name: z
    .string()
    .min(1, 'Tenant name is required')
    .max(100, 'Tenant name must be less than 100 characters')
    .trim()
    .optional(),
  slug: z
    .string()
    .min(1, 'Tenant slug is required')
    .max(50, 'Tenant slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Tenant slug must contain only lowercase letters, numbers, and hyphens')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  isActive: z
    .boolean()
    .optional()
});

// Tenant ID parameter validation schema
export const tenantIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Tenant ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'Tenant ID must be a positive number')
});

// Add user to tenant validation schema
export const addUserToTenantSchema = z.object({
  tenantId: z
    .number()
    .int()
    .positive('Tenant ID must be a positive integer'),
  userId: z
    .number()
    .int()
    .positive('User ID must be a positive integer')
});

// Remove user from tenant parameter validation schema
export const removeUserFromTenantParamsSchema = z.object({
  tenantId: z
    .string()
    .regex(/^\d+$/, 'Tenant ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'Tenant ID must be a positive number'),
  userId: z
    .string()
    .regex(/^\d+$/, 'User ID must be a valid number')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'User ID must be a positive number')
});

// Type definitions inferred from schemas
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type TenantIdParam = z.infer<typeof tenantIdParamSchema>;
export type AddUserToTenantInput = z.infer<typeof addUserToTenantSchema>;
export type RemoveUserFromTenantParams = z.infer<typeof removeUserFromTenantParamsSchema>;