import { Request, Response, NextFunction } from 'express';
import AnalyticsService from '../services/analytics';
import { auth } from '@clerk/nextjs/server';

export interface AnalyticsRequest extends Request {
  userId?: string;
  sessionId?: string;
  startTime?: number;
}

/**
 * Analytics middleware for automatic event tracking
 */
export const analyticsMiddleware = async (
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract user ID from Clerk
    const { userId } = await auth();
    if (userId) {
      req.userId = userId;
    }

    // Generate session ID if not present
    if (!req.sessionId) {
      req.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Record start time for response time calculation
    req.startTime = Date.now();

    // Track API endpoint usage
    if (req.userId) {
      await AnalyticsService.trackUserAction({
        userId: req.userId,
        sessionId: req.sessionId,
        eventType: 'api_endpoint_accessed',
        eventData: {
          method: req.method,
          path: req.path,
          query: req.query,
          userAgent: req.headers['user-agent'],
          referer: req.headers.referer,
          ip: req.ip || req.connection.remoteAddress,
        },
        metadata: {
          source: 'middleware',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Override res.json to track response data
    const originalJson = res.json;
    res.json = function(data: any) {
      // Track response time and status
      if (req.userId && req.startTime) {
        const responseTime = Date.now() - req.startTime;
        
        AnalyticsService.trackUserAction({
          userId: req.userId,
          sessionId: req.sessionId!,
          eventType: 'api_response_completed',
          eventData: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            responseSize: JSON.stringify(data).length,
          },
          metadata: {
            source: 'middleware',
            timestamp: new Date().toISOString(),
          },
        }).catch(console.error); // Don't block response for analytics errors
      }

      return originalJson.call(this, data);
    };

    // Override res.status to track error responses
    const originalStatus = res.status;
    res.status = function(statusCode: number) {
      // Track error responses
      if (req.userId && statusCode >= 400) {
        AnalyticsService.trackUserAction({
          userId: req.userId,
          sessionId: req.sessionId!,
          eventType: 'api_error_response',
          eventData: {
            method: req.method,
            path: req.path,
            statusCode,
            errorType: statusCode >= 500 ? 'server_error' : 'client_error',
          },
          metadata: {
            source: 'middleware',
            timestamp: new Date().toISOString(),
          },
        }).catch(console.error);
      }

      return originalStatus.call(this, statusCode);
    };

    next();
  } catch (error) {
    // Don't block request processing for analytics errors
    console.error('Analytics middleware error:', error);
    next();
  }
};

/**
 * Feature usage tracking middleware
 */
export const featureUsageMiddleware = (feature: string) => {
  return async (req: AnalyticsRequest, res: Response, next: NextFunction) => {
    try {
      if (req.userId) {
        await AnalyticsService.trackFeatureUsage({
          userId: req.userId,
          sessionId: req.sessionId || 'unknown',
          feature,
          action: 'accessed',
          metadata: {
            method: req.method,
            path: req.path,
            source: 'middleware',
          },
        });
      }
      next();
    } catch (error) {
      console.error('Feature usage middleware error:', error);
      next();
    }
  };
};

/**
 * Conversion tracking middleware
 */
export const conversionTrackingMiddleware = (funnel: string, step: string, stepNumber: number) => {
  return async (req: AnalyticsRequest, res: Response, next: NextFunction) => {
    try {
      if (req.userId) {
        await AnalyticsService.trackConversion({
          userId: req.userId,
          sessionId: req.sessionId || 'unknown',
          funnel,
          step,
          stepNumber,
          metadata: {
            method: req.method,
            path: req.path,
            source: 'middleware',
            userAgent: req.headers['user-agent'],
          },
        });
      }
      next();
    } catch (error) {
      console.error('Conversion tracking middleware error:', error);
      next();
    }
  };
};

/**
 * Subscription event tracking middleware
 */
export const subscriptionEventMiddleware = (eventType: string) => {
  return async (req: AnalyticsRequest, res: Response, next: NextFunction) => {
    try {
      if (req.userId) {
        const { planId, amount, currency } = req.body;
        
        await AnalyticsService.trackSubscriptionEvent({
          userId: req.userId,
          eventType,
          planId,
          amount,
          currency,
          metadata: {
            method: req.method,
            path: req.path,
            source: 'middleware',
          },
        });
      }
      next();
    } catch (error) {
      console.error('Subscription event middleware error:', error);
      next();
    }
  };
};

/**
 * Session tracking middleware
 */
export const sessionTrackingMiddleware = async (
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.userId) {
      // Track session start
      await AnalyticsService.trackUserAction({
        userId: req.userId,
        sessionId: req.sessionId!,
        eventType: 'session_started',
        eventData: {
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          referer: req.headers.referer,
          ip: req.ip || req.connection.remoteAddress,
        },
        metadata: {
          source: 'middleware',
          sessionType: 'api',
        },
      });

      // Set up session end tracking on response finish
      res.on('finish', () => {
        if (req.userId && req.startTime) {
          const sessionDuration = Date.now() - req.startTime;
          
          AnalyticsService.trackUserAction({
            userId: req.userId,
            sessionId: req.sessionId!,
            eventType: 'session_ended',
            eventData: {
              duration: sessionDuration,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString(),
            },
            metadata: {
              source: 'middleware',
              sessionType: 'api',
            },
          }).catch(console.error);
        }
      });
    }

    next();
  } catch (error) {
    console.error('Session tracking middleware error:', error);
    next();
  }
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoringMiddleware = async (
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const startTime = Date.now();
    
    // Track request start
    if (req.userId) {
      await AnalyticsService.trackUserAction({
        userId: req.userId,
        sessionId: req.sessionId!,
        eventType: 'request_started',
        eventData: {
          method: req.method,
          path: req.path,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          source: 'middleware',
          type: 'performance',
        },
      });
    }

    // Override res.end to track request completion
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Track request completion
      if (req.userId) {
        AnalyticsService.trackUserAction({
          userId: req.userId,
          sessionId: req.sessionId!,
          eventType: 'request_completed',
          eventData: {
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString(),
          },
          metadata: {
            source: 'middleware',
            type: 'performance',
          },
        }).catch(console.error);
      }

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  } catch (error) {
    console.error('Performance monitoring middleware error:', error);
    next();
  }
};

/**
 * Privacy-compliant data collection middleware
 */
export const privacyCompliantMiddleware = async (
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for analytics consent header
    const analyticsConsent = req.headers['x-analytics-consent'];
    
    if (analyticsConsent === 'false') {
      // Skip analytics collection if user hasn't consented
      req.userId = undefined;
      req.sessionId = undefined;
    }

    // Check for do-not-track header
    const doNotTrack = req.headers['dnt'];
    if (doNotTrack === '1') {
      // Respect do-not-track preference
      req.userId = undefined;
      req.sessionId = undefined;
    }

    next();
  } catch (error) {
    console.error('Privacy compliance middleware error:', error);
    next();
  }
};

/**
 * Geographic and device information middleware
 */
export const deviceInfoMiddleware = async (
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.userId) {
      // Extract device and geographic information
      const userAgent = req.headers['user-agent'] || '';
      const acceptLanguage = req.headers['accept-language'] || '';
      const ip = req.ip || req.connection.remoteAddress;

      // Basic device detection
      const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
      const isDesktop = !isMobile && !isTablet;

      // Track device information
      await AnalyticsService.trackUserAction({
        userId: req.userId,
        sessionId: req.sessionId!,
        eventType: 'device_info_captured',
        eventData: {
          isMobile,
          isTablet,
          isDesktop,
          userAgent: userAgent.substring(0, 200), // Limit length
          acceptLanguage: acceptLanguage.substring(0, 100),
          ip: ip ? ip.substring(0, 50) : undefined,
        },
        metadata: {
          source: 'middleware',
          type: 'device_info',
        },
      });
    }

    next();
  } catch (error) {
    console.error('Device info middleware error:', error);
    next();
  }
};

export default {
  analyticsMiddleware,
  featureUsageMiddleware,
  conversionTrackingMiddleware,
  subscriptionEventMiddleware,
  sessionTrackingMiddleware,
  performanceMonitoringMiddleware,
  privacyCompliantMiddleware,
  deviceInfoMiddleware,
};
