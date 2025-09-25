import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { auth } from '@clerk/nextjs/server';
import AnalyticsService from '../services/analytics';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many analytics requests from this IP, please try again later.',
});

const trackingRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 tracking requests per minute
  message: 'Too many tracking requests from this IP, please try again later.',
});

// Validation schemas
const TrackEventSchema = z.object({
  sessionId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

const DateRangeSchema = z.object({
  start: z.string().transform(str => new Date(str)),
  end: z.string().transform(str => new Date(str)),
});

const ExportSchema = z.object({
  format: z.enum(['csv', 'json']),
  dateRange: DateRangeSchema,
});

// Middleware to extract user ID from Clerk
const extractUserId = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    (req as any).userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// POST /api/analytics/track - Track custom events
router.post('/track', trackingRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const validatedData = TrackEventSchema.parse(req.body);

    const result = await AnalyticsService.trackUserAction({
      userId,
      ...validatedData,
    });

    if (result.success) {
      res.json({ success: true, message: 'Event tracked successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// POST /api/analytics/conversion - Track conversion funnel steps
router.post('/conversion', trackingRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { sessionId, funnel, step, stepNumber, metadata } = req.body;

    const result = await AnalyticsService.trackConversion({
      userId,
      sessionId,
      funnel,
      step,
      stepNumber,
      metadata,
    });

    if (result.success) {
      res.json({ success: true, message: 'Conversion tracked successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// POST /api/analytics/feature - Track feature usage
router.post('/feature', trackingRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { sessionId, feature, action, duration, metadata } = req.body;

    const result = await AnalyticsService.trackFeatureUsage({
      userId,
      sessionId,
      feature,
      action,
      duration,
      metadata,
    });

    if (result.success) {
      res.json({ success: true, message: 'Feature usage tracked successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// GET /api/analytics/dashboard - Admin analytics dashboard data
router.get('/dashboard', analyticsRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { start, end } = DateRangeSchema.parse(req.query);

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get analytics data
    const [conversionFunnel, retention, userBehavior] = await Promise.all([
      AnalyticsService.getConversionFunnel('signup', { start, end }),
      AnalyticsService.getUserRetention({ start, end }),
      AnalyticsService.getUserBehaviorAnalytics(userId, { start, end }),
    ]);

    // Get system metrics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    const dashboardData = {
      conversionFunnel: conversionFunnel.data || {},
      retention: retention.data || [],
      userBehavior: userBehavior.data || {},
      systemMetrics: {
        totalUsers,
        activeUsers: activeUsers.length,
        period: { start, end },
      },
    };

    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error getting analytics dashboard:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// GET /api/analytics/usage/:userId - Individual user usage analytics
router.get('/usage/:targetUserId', analyticsRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { targetUserId } = req.params;
    const { start, end } = DateRangeSchema.parse(req.query);

    // Check if user is requesting their own data or is admin
    if (userId !== targetUserId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get usage metrics
    const usageMetrics = await prisma.usageMetrics.findMany({
      where: {
        userId: targetUserId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get user behavior analytics
    const behaviorAnalytics = await AnalyticsService.getUserBehaviorAnalytics(
      targetUserId,
      { start, end }
    );

    const usageData = {
      usageMetrics,
      behaviorAnalytics: behaviorAnalytics.data || {},
      period: { start, end },
    };

    res.json({ success: true, data: usageData });
  } catch (error) {
    console.error('Error getting usage analytics:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// GET /api/analytics/conversion-funnel - Conversion funnel analysis
router.get('/conversion-funnel', analyticsRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { funnel = 'signup', start, end } = DateRangeSchema.parse(req.query);

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await AnalyticsService.getConversionFunnel(funnel, { start, end });

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting conversion funnel:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// GET /api/analytics/retention - User retention metrics
router.get('/retention', analyticsRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { start, end } = DateRangeSchema.parse(req.query);

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await AnalyticsService.getUserRetention({ start, end });

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error getting retention metrics:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// GET /api/analytics/export - Export analytics data
router.get('/export', analyticsRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { format, dateRange } = ExportSchema.parse(req.query);

    const result = await AnalyticsService.exportAnalyticsData(
      userId,
      format,
      dateRange
    );

    if (result.success) {
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.csv"`);
        
        // Convert to CSV format
        const csvHeaders = ['timestamp', 'eventType', 'sessionId', 'eventData', 'metadata'];
        const csvContent = [
          csvHeaders.join(','),
          ...result.data.map((row: any) => 
            csvHeaders.map(header => `"${row[header] || ''}"`).join(',')
          )
        ].join('\n');
        
        res.send(csvContent);
      } else {
        res.json({ success: true, data: result.data });
      }
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// POST /api/analytics/aggregate - Trigger usage metrics aggregation
router.post('/aggregate', analyticsRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { date } = req.body;

    const targetDate = date ? new Date(date) : new Date();
    const result = await AnalyticsService.aggregateUsageMetrics(userId, targetDate);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error aggregating usage metrics:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

// POST /api/analytics/cleanup - Cleanup old analytics data (admin only)
router.post('/cleanup', analyticsRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { retentionDays = 90 } = req.body;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await AnalyticsService.cleanupOldData(retentionDays);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Cleanup completed successfully',
        deletedEvents: result.deletedEvents,
        deletedMetrics: result.deletedMetrics,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error cleaning up analytics data:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid request data' 
    });
  }
});

export default router;
