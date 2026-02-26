import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { dbManager } from '../services/dbManager';
import { sessionManager } from '../services/sessionManager';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: Role;
      };
    }
  }
}

export interface SessionJwtPayload {
  userId: number;
  sessionId: string;
  type: 'access';
}

export interface ExtendedJwtPayload extends SessionJwtPayload {
  email: string;
  role: Role;
}

// Middleware to verify JWT token with session validation
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as SessionJwtPayload;
    
    // Validate session
    const sessionData = await sessionManager.validateSession(decoded.sessionId);
    if (!sessionData) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    // Verify user still exists in database
    const prisma = dbManager.getClient();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
};

// Middleware to check if user has required role
export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Convenience middleware for admin-only routes
export const requireAdmin = requireRole([Role.ADMIN]);

// Convenience middleware for authenticated users (any role)
export const requireAuth = authenticateToken;