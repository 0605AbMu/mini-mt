import { Request, Response } from 'express';
import { dbManager } from '../services/dbManager';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = dbManager.getClient();
    const tenantId = req.tenantId;

    let users;
    
    if (tenantId) {
      // If tenant context is provided, filter users by tenant
      users = await prisma.user.findMany({
        where: {
          userTenants: {
            some: {
              tenantId: tenantId
            }
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          userTenants: {
            where: {
              tenantId: tenantId
            },
            select: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      });
    } else {
      // If no tenant context, return all users (admin view)
      users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          userTenants: {
            select: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          }
        }
      });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  res.status(410).json({ 
    error: 'This endpoint is deprecated. Use /auth/register instead.',
    message: 'Please use POST /auth/register for user registration'
  });
};