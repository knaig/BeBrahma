import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

// Extend the Request interface to include userId and user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

// Middleware to require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  ClerkExpressRequireAuth()(req, res, (err) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Extract userId from auth
    const auth = (req as any).auth;
    if (!auth?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    req.userId = auth.userId;
    next();
  });
};

// Middleware to optionally include auth (for public routes that benefit from auth context)
export const withAuth = (req: Request, res: Response, next: NextFunction) => {
  ClerkExpressWithAuth()(req, res, (err) => {
    if (err) {
      // Log error but don't block the request
      console.warn('Auth error in withAuth middleware:', err);
    }
    
    // Extract userId from auth if available
    const auth = (req as any).auth;
    if (auth?.userId) {
      req.userId = auth.userId;
    }
    
    next();
  });
};

// Middleware to require admin role
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user from Clerk to check their role
    const { clerkClient } = await import('@clerk/clerk-sdk-node');
    const user = await clerkClient.users.getUser(req.userId);
    
    const userRole = user.publicMetadata?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Combined middleware for requiring auth and admin role
export const requireAuthAndAdmin = [requireAuth, requireAdmin];

// Middleware to extract user info (requires auth to be called first)
export const extractUserInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return next(); // Skip if no user ID
    }

    const { clerkClient } = await import('@clerk/clerk-sdk-node');
    const user = await clerkClient.users.getUser(req.userId);
    req.user = user;
    
    next();
  } catch (error) {
    console.error('User info extraction error:', error);
    // Don't fail the request, just continue without user info
    next();
  }
};