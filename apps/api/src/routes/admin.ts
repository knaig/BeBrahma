import express from 'express';
import { z } from 'zod';
import { ChatOrchestrator } from '../ai/chat-orchestrator';
import { requireAuthAndAdmin } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();
const router = express.Router();

// Lazy initialization of ChatOrchestrator to avoid module-level instantiation errors
let chatOrchestrator: ChatOrchestrator | null = null;

function getChatOrchestrator(): ChatOrchestrator {
  if (!chatOrchestrator) {
    try {
      chatOrchestrator = new ChatOrchestrator();
    } catch (error) {
      console.error('Failed to initialize ChatOrchestrator:', error);
      throw error;
    }
  }
  return chatOrchestrator;
}

// Input validation schemas
const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'moderator']),
});

const getUsersSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
});

// Apply admin authentication and rate limiting to all admin routes
router.use(requireAuthAndAdmin);
router.use(rateLimitMiddleware('admin'));

// GET /admin/users - Fetch all users with pagination
router.get('/users', async (req, res) => {
  try {
    const { page, limit, search } = getUsersSchema.parse(req.query);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Fetch users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({
      limit: limitNum,
      offset,
      query: search,
    });

    // Get subscription info for each user
    const usersWithSubscriptions = await Promise.all(
      clerkUsers.data.map(async (user) => {
        const subscription = await prisma.subscription.findUnique({
          where: { userId: user.id },
          select: {
            status: true,
            provider: true,
            currentPeriodEnd: true,
          },
        });

        const projectCount = await prisma.conversationSession.count({
          where: { userId: user.id },
        });

        return {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || 'No email',
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.publicMetadata?.role || 'user',
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt,
          subscription: subscription ? {
            status: subscription.status,
            provider: subscription.provider,
            currentPeriodEnd: subscription.currentPeriodEnd,
          } : null,
          projectCount,
        };
      })
    );

    res.json({
      success: true,
      users: usersWithSubscriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: clerkUsers.totalCount,
        hasMore: offset + limitNum < clerkUsers.totalCount,
      },
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /admin/users/:userId/role - Update user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = updateUserRoleSchema.parse(req.body);

    // Update user role in Clerk
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role,
      },
    });

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Admin role update error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// GET /admin/subscriptions - View all user subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        paymentMethods: {
          select: {
            type: true,
            last4: true,
            brand: true,
            isDefault: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get user info for each subscription
    const subscriptionsWithUsers = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const user = await clerkClient.users.getUser(sub.userId);
          return {
            ...sub,
            user: {
              email: user.emailAddresses[0]?.emailAddress || 'No email',
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name',
            },
          };
        } catch (error) {
          console.warn(`Failed to fetch user ${sub.userId}:`, error);
          return {
            ...sub,
            user: {
              email: 'Unknown',
              name: 'Unknown User',
            },
          };
        }
      })
    );

    res.json({
      success: true,
      subscriptions: subscriptionsWithUsers,
    });
  } catch (error) {
    console.error('Admin subscriptions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// GET /admin/dashboard - Enhanced admin dashboard data
router.get('/dashboard', async (_req, res) => {
  try {
    const orchestrator = getChatOrchestrator();
    // Get all active sessions
    const sessions = Array.from(orchestrator['sessions'].values());
    
    // Calculate system metrics
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => 
      s.updatedAt > new Date(Date.now() - 30 * 60 * 1000) // Active in last 30 minutes
    ).length;
    
    const totalMessages = sessions.reduce((sum, session) => 
      sum + session.messages.length, 0
    );
    
    const agentUsage = sessions.reduce((acc, session) => {
      session.messages.forEach(msg => {
        if (msg.sender === 'agent') {
          const agentId = msg.agentId || 'unknown';
          acc[agentId] = (acc[agentId] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    // Get billing metrics
    const totalUsers = await clerkClient.users.getCount();
    const totalSubscriptions = await prisma.subscription.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });

    const subscriptionsByProvider = await prisma.subscription.groupBy({
      by: ['provider'],
      _count: true,
    });

    const recentSubscriptions = await prisma.subscription.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        provider: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalSessions,
          activeSessions,
          totalMessages,
          systemUptime: process.uptime(),
          totalUsers: totalUsers.totalCount,
          totalSubscriptions,
          activeSubscriptions,
        },
        agentUsage,
        billing: {
          subscriptionsByProvider: subscriptionsByProvider.reduce((acc, item) => {
            acc[item.provider] = item._count;
            return acc;
          }, {} as Record<string, number>),
          recentSubscriptions,
        },
        recentActivity: sessions
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 10)
          .map(session => ({
            sessionId: session.sessionId,
            projectTitle: session.projectTitle,
            lastActivity: session.updatedAt,
            messageCount: session.messages.length,
            status: session.currentDecision ? 'decision_pending' : 'active'
          }))
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/sessions - List all sessions with details
router.get('/sessions', (_req, res) => {
  try {
    const sessions = Array.from(getChatOrchestrator()['sessions'].values());
    
    const sessionDetails = sessions.map(session => ({
      sessionId: session.sessionId,
      projectTitle: session.projectTitle,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messages.length,
      currentDecision: session.currentDecision,
      agents: session.messages
        .filter(msg => msg.sender === 'agent')
        .map(msg => ({
          agentId: msg.agentId,
          agentName: msg.agentName,
          department: msg.department,
          messageCount: 1
        }))
        .reduce((acc, agent) => {
          const existing = acc.find(a => a.agentId === agent.agentId);
          if (existing) {
            existing.messageCount++;
          } else {
            acc.push(agent);
          }
          return acc;
        }, [] as any[])
    }));

    res.json({
      success: true,
      sessions: sessionDetails
    });
  } catch (error) {
    console.error('Admin sessions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/sessions/:sessionId - Get detailed session information
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    const session = getChatOrchestrator()['sessions'].get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get internal details
    const internalDetails = getChatOrchestrator().getInternalDetails(sessionId);
    
    return res.json({
      success: true,
      session: {
        ...session,
        internalDetails
      }
    });
  } catch (error) {
    console.error('Admin session detail error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get session details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/agents - Get agent performance and usage statistics
router.get('/agents', (_req, res) => {
  try {
    const sessions = Array.from(getChatOrchestrator()['sessions'].values());
    
    // Aggregate agent statistics across all sessions
    const agentStats: Record<string, any> = {};
    
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.sender === 'agent') {
          const agentId = msg.agentId || 'unknown';
          if (!agentStats[agentId]) {
            agentStats[agentId] = {
              agentId,
              agentName: msg.agentName || 'Unknown',
              department: msg.department || 'Unknown',
              totalMessages: 0,
              totalThinkingTime: 0,
              averageConfidence: 0,
              confidenceScores: [],
              dataPoints: 0,
              sessions: new Set()
            };
          }
          
          agentStats[agentId].totalMessages++;
          agentStats[agentId].totalThinkingTime += msg.metadata?.thinkingTime || 0;
          if (msg.metadata?.confidence) {
            agentStats[agentId].confidenceScores.push(msg.metadata.confidence);
          }
          agentStats[agentId].dataPoints += msg.metadata?.dataPoints?.length || 0;
          agentStats[agentId].sessions.add(session.sessionId);
        }
      });
    });

    // Calculate averages and format response
    const formattedStats = Object.values(agentStats).map((stat: any) => ({
      ...stat,
      averageThinkingTime: stat.totalMessages > 0 ? stat.totalThinkingTime / stat.totalMessages : 0,
      averageConfidence: stat.confidenceScores.length > 0 
        ? stat.confidenceScores.reduce((a: number, b: number) => a + b, 0) / stat.confidenceScores.length 
        : 0,
      uniqueSessions: stat.sessions.size,
      sessions: undefined // Remove Set from response
    }));

    res.json({
      success: true,
      agents: formattedStats
    });
  } catch (error) {
    console.error('Admin agents error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get agent statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/performance - Get system performance metrics
router.get('/performance', (_req, res) => {
  try {
    const sessions = Array.from(getChatOrchestrator()['sessions'].values());
    
    // Calculate performance metrics
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const totalAgentMessages = sessions.reduce((sum, session) => 
      sum + session.messages.filter(msg => msg.sender === 'agent').length, 0
    );
    
    const averageResponseTime = sessions.reduce((sum, session) => {
      let sessionResponseTime = 0;
      let responseCount = 0;
      
      session.messages.forEach(msg => {
        if (msg.sender === 'agent' && msg.metadata?.thinkingTime) {
          sessionResponseTime += msg.metadata.thinkingTime;
          responseCount++;
        }
      });
      
      return sum + (responseCount > 0 ? sessionResponseTime / responseCount : 0);
    }, 0) / Math.max(sessions.length, 1);

    const successRate = sessions.length > 0 ? 
      (sessions.filter(s => s.messages.length > 1).length / sessions.length) * 100 : 0;

    res.json({
      success: true,
      performance: {
        totalSessions: sessions.length,
        totalMessages,
        totalAgentMessages,
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        systemUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        activeConnections: sessions.filter(s => 
          s.updatedAt > new Date(Date.now() - 5 * 60 * 1000) // Active in last 5 minutes
        ).length
      }
    });
  } catch (error) {
    console.error('Admin performance error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/real-time - Get real-time system status (for live monitoring)
router.get('/real-time', (_req, res) => {
  try {
    const sessions = Array.from(getChatOrchestrator()['sessions'].values());
    
    // Get currently active sessions
    const activeSessions = sessions.filter(s => 
      s.updatedAt > new Date(Date.now() - 2 * 60 * 1000) // Active in last 2 minutes
    );

    // Get recent messages (last 10 minutes)
    const recentMessages = sessions.flatMap(session => 
      session.messages
        .filter(msg => msg.timestamp > new Date(Date.now() - 10 * 60 * 1000))
        .map(msg => ({
          ...msg,
          sessionId: session.sessionId,
          projectTitle: session.projectTitle
        }))
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({
      success: true,
      realTime: {
        timestamp: new Date().toISOString(),
        activeSessions: activeSessions.length,
        recentMessages: recentMessages.slice(0, 20), // Last 20 messages
        systemStatus: 'healthy',
        lastActivity: recentMessages[0]?.timestamp || null
      }
    });
  } catch (error) {
    console.error('Admin real-time error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get real-time data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/analytics - Get comprehensive analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    // Get user metrics
    const totalUsers = await clerkClient.users.getCount();
    const activeUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Get subscription metrics
    const totalSubscriptions = await prisma.subscription.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'ACTIVE' }
    });
    const revenueData = await prisma.subscription.aggregate({
      _sum: { amount: true },
      where: { status: 'ACTIVE' }
    });

    // Get feedback metrics
    const feedbackStats = await prisma.feedback.groupBy({
      by: ['status', 'type'],
      _count: true
    });

    res.json({
      success: true,
      analytics: {
        userMetrics: {
          totalUsers: totalUsers.totalCount,
          activeUsers,
          newUsers: Math.floor(totalUsers.totalCount * 0.1), // Mock data
          churnedUsers: Math.floor(totalUsers.totalCount * 0.05), // Mock data
          userGrowth: 12.5, // Mock data
          retentionRate: 87.3 // Mock data
        },
        revenueMetrics: {
          totalRevenue: revenueData._sum.amount || 0,
          monthlyRecurringRevenue: (revenueData._sum.amount || 0) * 0.8, // Mock data
          averageRevenuePerUser: totalSubscriptions > 0 ? (revenueData._sum.amount || 0) / totalSubscriptions : 0,
          revenueGrowth: 18.2, // Mock data
          conversionRate: 3.4 // Mock data
        },
        feedbackMetrics: {
          total: feedbackStats.reduce((sum, item) => sum + item._count, 0),
          byStatus: feedbackStats.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as Record<string, number>),
          byType: feedbackStats.reduce((acc, item) => {
            acc[item.type] = item._count;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/feedback - Get feedback list with filtering
router.get('/feedback', async (req, res) => {
  try {
    const { range = '30d', status, type, page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;
    
    // Add date range filter
    if (range !== 'all') {
      const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
      where.createdAt = {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };
    }

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.feedback.count({ where })
    ]);

    res.json({
      success: true,
      feedback,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: offset + limitNum < total
      }
    });
  } catch (error) {
    console.error('Admin feedback error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get feedback data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /admin/feedback/analytics - Get feedback analytics
router.get('/feedback/analytics', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    // Add date range filter
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const dateFilter = {
      gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    };

    const [total, byStatus, byType, averageRating] = await Promise.all([
      prisma.feedback.count({ where: { createdAt: dateFilter } }),
      prisma.feedback.groupBy({
        by: ['status'],
        _count: true,
        where: { createdAt: dateFilter }
      }),
      prisma.feedback.groupBy({
        by: ['type'],
        _count: true,
        where: { createdAt: dateFilter }
      }),
      prisma.feedback.aggregate({
        _avg: { rating: true },
        where: { 
          createdAt: dateFilter,
          rating: { not: null }
        }
      })
    ]);

    res.json({
      success: true,
      analytics: {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
        averageRating: averageRating._avg.rating || 0
      }
    });
  } catch (error) {
    console.error('Admin feedback analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get feedback analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /admin/feedback/:id/status - Update feedback status
router.put('/feedback/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      feedback: updatedFeedback
    });
  } catch (error) {
    console.error('Admin feedback status update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update feedback status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
