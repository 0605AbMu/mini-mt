import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { config } from '../config';
import { dbManager } from '../services/dbManager';
import { sessionManager } from '../services/sessionManager';
import { 
  LoginInput, 
  loginSchema, 
  RegisterInput, 
  registerSchema,
  RefreshTokenInput,
  refreshTokenSchema,
  LogoutInput,
  logoutSchema
} from '../utils/validation';
import { formatZodError } from '../middleware/validation';

export const register = async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const validationResult = registerSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: validationResult.error.issues
    });
    return;
  }

  const { email, password, name, role }: RegisterInput = validationResult.data;
  const prisma = dbManager.getClient();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    res.status(409).json({ error: 'User with this email already exists' });
    return;
  }

  try {
    // Hash password with configured salt rounds
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptSaltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role as Role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // Create session and generate tokens
    const tokenPair = await sessionManager.createSession({
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceInfo: req.get('User-Agent'), // Could be enhanced with device detection
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues
      });
      return;
    }

    const { email, password }: LoginInput = validationResult.data;
    const prisma = dbManager.getClient();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Create session and generate tokens
    const tokenPair = await sessionManager.createSession({
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceInfo: req.get('User-Agent'), // Could be enhanced with device detection
    });

    // Return user info (without password) and tokens
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Refresh token endpoint
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validationResult = refreshTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(formatZodError(validationResult.error));
      return;
    }

    const { refreshToken }: RefreshTokenInput = validationResult.data;

    const tokenPair = await sessionManager.refreshSession(refreshToken);

    if (!tokenPair) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

// Logout endpoint
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input (refreshToken is optional for logout)
    const validationResult = logoutSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json(formatZodError(validationResult.error));
      return;
    }

    const { refreshToken }: LogoutInput = validationResult.data;

    if (refreshToken) {
      // Find and invalidate session by refresh token
      const prisma = dbManager.getClient();
      const session = await prisma.session.findUnique({
        where: { refreshToken },
      });

      if (session) {
        await sessionManager.invalidateSession(session.id);
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};

// Logout from all devices
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await sessionManager.invalidateAllUserSessions(req.user.id);

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to logout from all devices' });
  }
};

// Get user sessions
export const getUserSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const sessions = await sessionManager.getUserSessions(req.user.id);

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // This would require authentication middleware to be applied
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const prisma = dbManager.getClient();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};