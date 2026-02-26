import { Request, Response } from 'express';
import { dbManager } from '../services/dbManager';
import { 
  CreateTenantInput,
  createTenantSchema,
  UpdateTenantInput,
  updateTenantSchema,
  TenantIdParam,
  tenantIdParamSchema,
  AddUserToTenantInput,
  addUserToTenantSchema,
  RemoveUserFromTenantParams,
  removeUserFromTenantParamsSchema
} from '../utils/validation';
import { formatZodError } from '../middleware/validation';

export const getAllTenants = async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = dbManager.getClient();
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            userTenants: true
          }
        }
      }
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

export const getTenantById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate parameters
    const paramsValidation = tenantIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json(formatZodError(paramsValidation.error));
      return;
    }

    const { id }: TenantIdParam = paramsValidation.data;
    const prisma = dbManager.getClient();
    
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        userTenants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
};

export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = createTenantSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(formatZodError(validationResult.error));
      return;
    }

    const { name, slug, description }: CreateTenantInput = validationResult.data;
    const prisma = dbManager.getClient();
    
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        description
      }
    });

    res.status(201).json(tenant);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Tenant with this name or slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  }
};

export const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate parameters
    const paramsValidation = tenantIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json(formatZodError(paramsValidation.error));
      return;
    }

    // Validate body
    const bodyValidation = updateTenantSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json(formatZodError(bodyValidation.error));
      return;
    }

    const { id }: TenantIdParam = paramsValidation.data;
    const { name, slug, description, isActive }: UpdateTenantInput = bodyValidation.data;
    
    const prisma = dbManager.getClient();
    
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(tenant);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Tenant not found' });
    } else if (error.code === 'P2002') {
      res.status(409).json({ error: 'Tenant with this name or slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  }
};

export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = tenantIdParamSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json(formatZodError(paramsValidation.error));
      return;
    }

    const { id }: TenantIdParam = paramsValidation.data;
    const prisma = dbManager.getClient();

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    await prisma.tenant.delete({ where: { id } });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Tenant not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  }
};

export const addUserToTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = req.body;
    
    if (!tenantId || !userId) {
      res.status(400).json({ error: 'TenantId and userId are required' });
      return;
    }

    const prisma = dbManager.getClient();
    
    const userTenant = await prisma.userTenant.create({
      data: {
        userId: parseInt(userId),
        tenantId: parseInt(tenantId)
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    res.status(201).json(userTenant);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'User is already assigned to this tenant' });
    } else if (error.code === 'P2003') {
      res.status(404).json({ error: 'User or tenant not found' });
    } else {
      res.status(500).json({ error: 'Failed to add user to tenant' });
    }
  }
};

export const removeUserFromTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = req.params;
    
    const prisma = dbManager.getClient();
    
    await prisma.userTenant.delete({
      where: {
        userId_tenantId: {
          userId: parseInt(userId as string),
          tenantId: parseInt(tenantId as string)
        }
      }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User-tenant relationship not found' });
    } else {
      res.status(500).json({ error: 'Failed to remove user from tenant' });
    }
  }
};