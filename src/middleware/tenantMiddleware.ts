import { Request, Response, NextFunction } from 'express';
import { dbManager } from '../services/dbManager';

// Extend Request interface to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: number;
        name: string;
        slug: string;
        isActive: boolean;
      };
      tenantId?: number;
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      res.status(400).json({ 
        error: 'X-Tenant-Id header is required',
        message: 'Please provide a valid tenant ID in the X-Tenant-Id header'
      });
      return;
    }

    // Validate tenant ID format
    const parsedTenantId = parseInt(tenantId);
    if (isNaN(parsedTenantId) || parsedTenantId <= 0) {
      res.status(400).json({ 
        error: 'Invalid tenant ID format',
        message: 'X-Tenant-Id must be a positive integer'
      });
      return;
    }

    // Check if tenant exists and is active
    const prisma = dbManager.getClient();
    const tenant = await prisma.tenant.findUnique({
      where: { id: parsedTenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true
      }
    });

    if (!tenant) {
      res.status(404).json({ 
        error: 'Tenant not found',
        message: `Tenant with ID ${parsedTenantId} does not exist`
      });
      return;
    }

    if (!tenant.isActive) {
      res.status(403).json({ 
        error: 'Tenant is inactive',
        message: `Tenant '${tenant.name}' is currently inactive`
      });
      return;
    }

    // Add tenant information to request object
    req.tenant = tenant;
    req.tenantId = tenant.id;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process tenant information'
    });
  }
};

// Optional middleware for routes that don't require tenant (like tenant management)
export const optionalTenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      // No tenant ID provided, continue without tenant context
      next();
      return;
    }

    // If tenant ID is provided, validate it
    const parsedTenantId = parseInt(tenantId);
    if (isNaN(parsedTenantId) || parsedTenantId <= 0) {
      res.status(400).json({ 
        error: 'Invalid tenant ID format',
        message: 'X-Tenant-Id must be a positive integer'
      });
      return;
    }

    const prisma = dbManager.getClient();
    const tenant = await prisma.tenant.findUnique({
      where: { id: parsedTenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true
      }
    });

    if (tenant && tenant.isActive) {
      req.tenant = tenant;
      req.tenantId = tenant.id;
    }

    next();
  } catch (error) {
    console.error('Optional tenant middleware error:', error);
    next(); // Continue even if there's an error
  }
};