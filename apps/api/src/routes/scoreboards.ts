import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createScoreboardSchema = z.object({
  workspaceSlug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  metrics: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(['NUMBER', 'PERCENTAGE', 'CURRENCY', 'BOOLEAN']),
      target: z.number(),
      unit: z.string().optional(),
      frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    })
  ),
  reviewFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
});

const recordMetricSchema = z.object({
  metricId: z.string().min(1),
  value: z.number(),
  notes: z.string().optional(),
});

const createReviewSchema = z.object({
  scoreboardId: z.string().min(1),
  insights: z.string().optional(),
  actions: z.array(
    z.object({
      description: z.string().min(1),
      priority: z.enum(['P0', 'P1', 'P2']),
      dueDate: z.string().optional(),
    })
  ).optional(),
});

// Create scoreboard
router.post('/scoreboards', requireAuth, async (req, res) => {
  try {
    const validation = createScoreboardSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { workspaceSlug, name, description, metrics, reviewFrequency } = validation.data;
    const userId = req.user.id;

    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: { slug: workspaceSlug, userId },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    // Create scoreboard with metrics
    const scoreboard = await prisma.scoreboard.create({
      data: {
        workspaceId: workspace.id,
        name,
        description,
        reviewFrequency,
        status: 'ACTIVE',
        metrics: metrics as any,
        metricHistory: [],
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: scoreboard,
    });
  } catch (error) {
    console.error('Create scoreboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create scoreboard',
    });
  }
});

// List scoreboards
router.get('/scoreboards', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceSlug, status } = req.query;

    const where: any = {
      workspace: { userId },
    };

    if (workspaceSlug) {
      where.workspace.slug = workspaceSlug;
    }

    if (status) {
      where.status = status;
    }

    const scoreboards = await prisma.scoreboard.findMany({
      where,
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: scoreboards,
    });
  } catch (error) {
    console.error('List scoreboards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list scoreboards',
    });
  }
});

// Get scoreboard by ID
router.get('/scoreboards/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { period = '30' } = req.query; // days

    const scoreboard = await prisma.scoreboard.findFirst({
      where: {
        id,
        workspace: { userId },
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!scoreboard) {
      return res.status(404).json({
        success: false,
        error: 'Scoreboard not found',
      });
    }

    // Calculate metric statistics
    const metrics = scoreboard.metrics as any[];
    const history = scoreboard.metricHistory as any[];

    const periodDays = parseInt(period as string);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const recentHistory = history.filter((entry) => new Date(entry.timestamp) >= cutoffDate);

    const metricsWithStats = metrics.map((metric) => {
      const metricHistory = recentHistory.filter((entry) => entry.metricId === metric.id);
      const values = metricHistory.map((entry) => entry.value);

      const current = values.length > 0 ? values[values.length - 1] : null;
      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const trend =
        values.length >= 2
          ? values[values.length - 1] - values[values.length - 2]
          : 0;

      const targetProgress = metric.target > 0 && current !== null ? (current / metric.target) * 100 : 0;

      return {
        ...metric,
        current,
        average,
        trend,
        targetProgress,
        history: metricHistory,
      };
    });

    res.json({
      success: true,
      data: {
        ...scoreboard,
        metrics: metricsWithStats,
      },
    });
  } catch (error) {
    console.error('Get scoreboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scoreboard',
    });
  }
});

// Record metric value
router.post('/scoreboards/:id/metrics', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const validation = recordMetricSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { metricId, value, notes } = validation.data;

    const scoreboard = await prisma.scoreboard.findFirst({
      where: {
        id,
        workspace: { userId },
      },
    });

    if (!scoreboard) {
      return res.status(404).json({
        success: false,
        error: 'Scoreboard not found',
      });
    }

    // Verify metric exists
    const metrics = scoreboard.metrics as any[];
    const metric = metrics.find((m) => m.id === metricId);

    if (!metric) {
      return res.status(404).json({
        success: false,
        error: 'Metric not found',
      });
    }

    // Add to history
    const history = scoreboard.metricHistory as any[];
    const newEntry = {
      metricId,
      value,
      notes,
      timestamp: new Date().toISOString(),
    };

    const updatedScoreboard = await prisma.scoreboard.update({
      where: { id },
      data: {
        metricHistory: [...history, newEntry] as any,
        lastUpdatedAt: new Date(),
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({
      success: true,
      data: updatedScoreboard,
    });
  } catch (error) {
    console.error('Record metric error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record metric',
    });
  }
});

// Create review session
router.post('/scoreboards/:id/reviews', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const validation = createReviewSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { insights, actions } = validation.data;

    const scoreboard = await prisma.scoreboard.findFirst({
      where: {
        id,
        workspace: { userId },
      },
    });

    if (!scoreboard) {
      return res.status(404).json({
        success: false,
        error: 'Scoreboard not found',
      });
    }

    // Get current metrics state
    const metrics = scoreboard.metrics as any[];
    const history = scoreboard.metricHistory as any[];

    const metricsSnapshot = metrics.map((metric) => {
      const metricHistory = history.filter((entry) => entry.metricId === metric.id);
      const current = metricHistory.length > 0 ? metricHistory[metricHistory.length - 1].value : null;

      return {
        metricId: metric.id,
        name: metric.name,
        current,
        target: metric.target,
        progress: metric.target > 0 && current !== null ? (current / metric.target) * 100 : 0,
      };
    });

    // Create review record
    const review = {
      timestamp: new Date().toISOString(),
      insights,
      metricsSnapshot,
      actions: actions || [],
    };

    const reviews = scoreboard.reviews as any[] || [];
    const updatedScoreboard = await prisma.scoreboard.update({
      where: { id },
      data: {
        reviews: [...reviews, review] as any,
        lastReviewAt: new Date(),
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Create tasks for actions if provided
    if (actions && actions.length > 0) {
      // Note: This assumes there's a project to attach tasks to
      // In a real implementation, you'd need to handle project selection
      const project = await prisma.project.findFirst({
        where: { userId },
      });

      if (project) {
        await Promise.all(
          actions.map((action) =>
            prisma.task.create({
              data: {
                projectId: project.id,
                title: action.description,
                priority: action.priority,
                status: 'TODO',
                dueDate: action.dueDate ? new Date(action.dueDate) : undefined,
                createdBy: userId,
              },
            })
          )
        );
      }
    }

    res.status(201).json({
      success: true,
      data: {
        scoreboard: updatedScoreboard,
        review,
      },
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review',
    });
  }
});

// Get scoreboard analytics
router.get('/scoreboards/:id/analytics', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const scoreboard = await prisma.scoreboard.findFirst({
      where: {
        id,
        workspace: { userId },
      },
    });

    if (!scoreboard) {
      return res.status(404).json({
        success: false,
        error: 'Scoreboard not found',
      });
    }

    const metrics = scoreboard.metrics as any[];
    const history = scoreboard.metricHistory as any[];
    const reviews = scoreboard.reviews as any[] || [];

    // Calculate analytics
    const analytics = {
      totalMetrics: metrics.length,
      totalDataPoints: history.length,
      totalReviews: reviews.length,
      lastReview: reviews.length > 0 ? reviews[reviews.length - 1].timestamp : null,
      metricsOnTrack: metrics.filter((m) => {
        const metricHistory = history.filter((entry) => entry.metricId === m.id);
        const current = metricHistory.length > 0 ? metricHistory[metricHistory.length - 1].value : 0;
        return current >= m.target;
      }).length,
      metricTrends: metrics.map((metric) => {
        const metricHistory = history
          .filter((entry) => entry.metricId === metric.id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const values = metricHistory.map((entry) => entry.value);
        const timestamps = metricHistory.map((entry) => entry.timestamp);

        let trend = 'stable';
        if (values.length >= 2) {
          const recent = values.slice(-3);
          const average = recent.reduce((a, b) => a + b, 0) / recent.length;
          const previous = values.slice(-6, -3);
          const previousAverage = previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : 0;

          if (average > previousAverage * 1.1) trend = 'up';
          else if (average < previousAverage * 0.9) trend = 'down';
        }

        return {
          metricId: metric.id,
          name: metric.name,
          trend,
          dataPoints: values.length,
          latestValue: values.length > 0 ? values[values.length - 1] : null,
          chartData: metricHistory.map((entry) => ({
            timestamp: entry.timestamp,
            value: entry.value,
          })),
        };
      }),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
    });
  }
});

export default router;
