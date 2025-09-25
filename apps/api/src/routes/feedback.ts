import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import AnalyticsService from '../services/analytics';

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting
const feedbackRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 feedback submissions per 15 minutes
  message: 'Too many feedback submissions from this IP, please try again later.',
});

const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 admin requests per 15 minutes
  message: 'Too many admin requests from this IP, please try again later.',
});

// Validation schemas
const FeedbackSubmissionSchema = z.object({
  type: z.enum(['BUG_REPORT', 'FEATURE_REQUEST', 'GENERAL', 'RATING', 'SURVEY_RESPONSE']),
  rating: z.number().min(1).max(5).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000).optional(),
  metadata: z.record(z.any()).optional(),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  attachments: z.array(z.string()).optional(),
});

const SurveyResponseSchema = z.object({
  surveyId: z.string(),
  responses: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

const FeedbackStatusUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  adminResponse: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

const FeedbackFilterSchema = z.object({
  type: z.enum(['BUG_REPORT', 'FEATURE_REQUEST', 'GENERAL', 'RATING', 'SURVEY_RESPONSE']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
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

// Middleware to check admin role
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { userId } = req as any;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Admin verification failed' });
  }
};

// POST /api/feedback - Submit user feedback
router.post('/', feedbackRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const validatedData = FeedbackSubmissionSchema.parse(req.body);

    // Create feedback record
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type: validatedData.type,
        rating: validatedData.rating,
        title: validatedData.title,
        description: validatedData.description,
        metadata: {
          category: validatedData.category,
          priority: validatedData.priority,
          attachments: validatedData.attachments,
          ...validatedData.metadata,
        },
      },
    });

    // Track feedback submission in analytics
    await AnalyticsService.trackUserAction({
      userId,
      sessionId: 'feedback',
      eventType: 'feedback_submitted',
      eventData: {
        feedbackId: feedback.id,
        type: validatedData.type,
        category: validatedData.category,
        priority: validatedData.priority,
      },
      metadata: {
        source: 'api',
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ 
      success: true, 
      message: 'Feedback submitted successfully',
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid feedback data' 
    });
  }
});

// GET /api/feedback - Get user's feedback history
router.get('/', feedbackRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.feedback.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      data: feedback,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

// GET /api/feedback/:id - Get specific feedback details
router.get('/:id', feedbackRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Check if user owns the feedback or is admin
    if (feedback.userId !== userId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error getting feedback details:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback details' });
  }
});

// POST /api/feedback/survey - Submit survey response
router.post('/survey', feedbackRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;
    const validatedData = SurveyResponseSchema.parse(req.body);

    // Create survey response as feedback
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type: 'SURVEY_RESPONSE',
        title: `Survey Response - ${validatedData.surveyId}`,
        description: 'Survey response submitted',
        metadata: {
          surveyId: validatedData.surveyId,
          responses: validatedData.responses,
          ...validatedData.metadata,
        },
      },
    });

    // Track survey response in analytics
    await AnalyticsService.trackUserAction({
      userId,
      sessionId: 'survey',
      eventType: 'survey_completed',
      eventData: {
        surveyId: validatedData.surveyId,
        feedbackId: feedback.id,
        responseCount: Object.keys(validatedData.responses).length,
      },
      metadata: {
        source: 'api',
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ 
      success: true, 
      message: 'Survey response submitted successfully',
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error('Error submitting survey response:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid survey data' 
    });
  }
});

// GET /api/feedback/surveys/active - Get active surveys
router.get('/surveys/active', feedbackRateLimit, extractUserId, async (req, res) => {
  try {
    const { userId } = req as any;

    // For now, return a static list of active surveys
    // In a real implementation, this would come from a surveys table
    const activeSurveys = [
      {
        id: 'user-satisfaction',
        title: 'User Satisfaction Survey',
        description: 'Help us improve your experience',
        questions: [
          {
            id: 'overall-satisfaction',
            type: 'rating',
            question: 'How satisfied are you with BeBrahma?',
            required: true,
          },
          {
            id: 'feature-request',
            type: 'text',
            question: 'What feature would you like to see next?',
            required: false,
          },
        ],
      },
      {
        id: 'feature-feedback',
        title: 'Feature Feedback',
        description: 'Tell us what you think about our features',
        questions: [
          {
            id: 'ai-agents',
            type: 'rating',
            question: 'How would you rate our AI agents?',
            required: true,
          },
          {
            id: 'workflow',
            type: 'rating',
            question: 'How would you rate our workflow system?',
            required: true,
          },
        ],
      },
    ];

    res.json({ success: true, data: activeSurveys });
  } catch (error) {
    console.error('Error getting active surveys:', error);
    res.status(500).json({ error: 'Failed to retrieve active surveys' });
  }
});

// Admin routes
// GET /api/admin/feedback - Admin feedback management
router.get('/admin', adminRateLimit, extractUserId, requireAdmin, async (req, res) => {
  try {
    const filters = FeedbackFilterSchema.parse(req.query);
    const skip = (filters.page - 1) * filters.limit;

    // Build where clause
    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      success: true,
      data: feedback,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error('Error getting admin feedback:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid filter parameters' 
    });
  }
});

// PUT /api/admin/feedback/:id/status - Update feedback status
router.put('/admin/:id/status', adminRateLimit, extractUserId, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = FeedbackStatusUpdateSchema.parse(req.body);

    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        status: updateData.status,
        metadata: {
          adminResponse: updateData.adminResponse,
          assignedTo: updateData.assignedTo,
          priority: updateData.priority,
          updatedAt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Track status update in analytics
    await AnalyticsService.trackUserAction({
      userId: (req as any).userId,
      sessionId: 'admin',
      eventType: 'feedback_status_updated',
      eventData: {
        feedbackId: id,
        newStatus: updateData.status,
        previousStatus: feedback.status,
        adminResponse: updateData.adminResponse,
        assignedTo: updateData.assignedTo,
        priority: updateData.priority,
      },
      metadata: {
        source: 'admin-api',
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ 
      success: true, 
      message: 'Feedback status updated successfully',
      data: feedback,
    });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Invalid update data' 
    });
  }
});

// GET /api/admin/feedback/analytics - Feedback analytics for admin
router.get('/admin/analytics', adminRateLimit, extractUserId, requireAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = end ? new Date(end as string) : new Date();

    // Get feedback statistics
    const [totalFeedback, feedbackByType, feedbackByStatus, feedbackByPriority] = await Promise.all([
      prisma.feedback.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.feedback.groupBy({
        by: ['type'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
      }),
      prisma.feedback.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
      }),
      prisma.feedback.groupBy({
        by: ['metadata'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Calculate average rating
    const ratingFeedback = await prisma.feedback.findMany({
      where: {
        type: 'RATING',
        rating: { not: null },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { rating: true },
    });

    const averageRating = ratingFeedback.length > 0
      ? ratingFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingFeedback.length
      : 0;

    // Calculate response time (time from submission to first admin response)
    const respondedFeedback = await prisma.feedback.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    const responseTimes = respondedFeedback.map(f => 
      f.updatedAt.getTime() - f.createdAt.getTime()
    );

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const analytics = {
      period: { start: startDate, end: endDate },
      totalFeedback,
      feedbackByType: feedbackByType.reduce((acc, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      feedbackByStatus: feedbackByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      averageRating: Math.round(averageRating * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime / (1000 * 60 * 60)), // Convert to hours
      totalRatings: ratingFeedback.length,
      responseRate: totalFeedback > 0 ? (respondedFeedback.length / totalFeedback) * 100 : 0,
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback analytics' });
  }
});

// POST /api/admin/feedback/bulk-action - Bulk feedback actions
router.post('/admin/bulk-action', adminRateLimit, extractUserId, requireAdmin, async (req, res) => {
  try {
    const { action, feedbackIds, data } = req.body;

    if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return res.status(400).json({ error: 'Invalid feedback IDs' });
    }

    let result;
    switch (action) {
      case 'update_status':
        if (!data.status) {
          return res.status(400).json({ error: 'Status is required for update_status action' });
        }
        result = await prisma.feedback.updateMany({
          where: { id: { in: feedbackIds } },
          data: { 
            status: data.status,
            metadata: {
              bulkUpdated: true,
              updatedAt: new Date(),
              adminResponse: data.adminResponse,
            },
          },
        });
        break;

      case 'assign':
        if (!data.assignedTo) {
          return res.status(400).json({ error: 'Assignee is required for assign action' });
        }
        result = await prisma.feedback.updateMany({
          where: { id: { in: feedbackIds } },
          data: {
            metadata: {
              assignedTo: data.assignedTo,
              bulkUpdated: true,
              updatedAt: new Date(),
            },
          },
        });
        break;

      case 'delete':
        result = await prisma.feedback.deleteMany({
          where: { id: { in: feedbackIds } },
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Track bulk action in analytics
    await AnalyticsService.trackUserAction({
      userId: (req as any).userId,
      sessionId: 'admin',
      eventType: 'feedback_bulk_action',
      eventData: {
        action,
        feedbackCount: feedbackIds.length,
        feedbackIds,
        data,
      },
      metadata: {
        source: 'admin-api',
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({ 
      success: true, 
      message: `Bulk action '${action}' completed successfully`,
      affectedCount: result.count,
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

export default router;
