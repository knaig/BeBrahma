import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiting configurations for different endpoints
const rateLimitConfigs = {
  // General API calls - 100 requests per 15 minutes per user
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Chat requests - 30 requests per 5 minutes per user
  chat: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30,
    message: 'Too many chat requests, please wait before sending more messages.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Billing operations - 20 requests per hour per user
  billing: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many billing requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // API key operations - 50 requests per hour per user
  'api-keys': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Too many API key requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Admin operations - 200 requests per hour per admin
  admin: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 200,
    message: 'Too many admin requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Auth operations - 10 requests per 5 minutes per IP
  auth: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many authentication requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
};

// Key generator function that considers user ID when available, otherwise uses IP
const generateKey = (req: Request): string => {
  // For authenticated users, use their user ID
  if (req.userId) {
    return `user:${req.userId}`;
  }
  
  // For unauthenticated users, use IP address
  return `ip:${req.ip}`;
};

// Create rate limiter instances
const rateLimiters: Record<string, any> = {};

Object.entries(rateLimitConfigs).forEach(([name, config]) => {
  rateLimiters[name] = rateLimit({
    ...config,
    keyGenerator: generateKey,
    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000),
        limit: config.max,
      });
    },
    // Skip successful requests from counting towards the limit for some endpoints
    skip: (req: Request, res: Response) => {
      // For chat endpoints, don't count successful responses to be more lenient
      if (name === 'chat' && res.statusCode < 400) {
        return false; // Still count them, but could be adjusted
      }
      return false;
    },
  });
});

// Main rate limiting middleware factory
export const rateLimitMiddleware = (type: keyof typeof rateLimitConfigs) => {
  return rateLimiters[type] || rateLimiters.general;
};

// Specific rate limiters for direct use
export const generalRateLimit = rateLimiters.general;
export const chatRateLimit = rateLimiters.chat;
export const billingRateLimit = rateLimiters.billing;
export const apiKeysRateLimit = rateLimiters['api-keys'];
export const adminRateLimit = rateLimiters.admin;
export const authRateLimit = rateLimiters.auth;

// Advanced rate limiting for premium users (higher limits)
export const createPremiumRateLimit = (baseType: keyof typeof rateLimitConfigs, multiplier = 2) => {
  const baseConfig = rateLimitConfigs[baseType];
  
  return rateLimit({
    ...baseConfig,
    max: baseConfig.max * multiplier,
    keyGenerator: generateKey,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: `${baseConfig.message} (Premium limits)`,
        retryAfter: Math.ceil(baseConfig.windowMs / 1000),
        limit: baseConfig.max * multiplier,
      });
    },
  });
};

// Middleware to apply different rate limits based on user subscription
export const adaptiveRateLimit = (baseType: keyof typeof rateLimitConfigs) => {
  const standardLimit = rateLimiters[baseType];
  const premiumLimit = createPremiumRateLimit(baseType);
  
  return async (req: Request, res: Response, next: Function) => {
    try {
      // Check if user has premium subscription
      if (req.userId) {
        // You can implement subscription checking logic here
        // For now, we'll use the standard rate limit for all users
        // TODO: Implement subscription-based rate limiting
      }
      
      // Apply standard rate limit
      return standardLimit(req, res, next);
    } catch (error) {
      console.error('Rate limit error:', error);
      next(error);
    }
  };
};

export default rateLimitMiddleware;