import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Calculate priority score for a task
 * Priority formula:
 * - P0 + overdue = 100
 * - P0 + due <24h = 90
 * - P0 + due <7d = 70
 * - P1 + overdue = 80
 * - P1 + due <24h = 60
 * - etc.
 */
function calculatePriorityScore(task: any): number {
  const now = new Date();
  let score = 0;

  // Base score from priority
  if (task.priority === 'P0') score += 70;
  else if (task.priority === 'P1') score += 40;
  else if (task.priority === 'P2') score += 20;
  else score += 10;

  // Urgency multiplier
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
      // Overdue
      score += 30;
    } else if (hoursUntilDue < 24) {
      // Due within 24 hours
      score += 20;
    } else if (hoursUntilDue < 168) {
      // Due within 7 days
      score += 10;
    }
  }

  // Status bonus (in_progress tasks are hot)
  if (task.status === 'IN_PROGRESS') score += 15;
  if (task.status === 'BLOCKED') score += 25; // Blocked tasks need attention!

  return score;
}

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get Mission Control dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         schema:
 *           type: string
 *         description: Filter by workspace (optional, defaults to all workspaces)
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { workspaceId } = req.query;

    // Get user's workspaces
    let workspaceIds: string[];
    if (workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId as string, userId },
      });
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
        });
      }
      workspaceIds = [workspace.id];
    } else {
      const workspaces = await prisma.workspace.findMany({
        where: { userId, status: 'active' },
        select: { id: true },
      });
      workspaceIds = workspaces.map((w) => w.id);
    }

    if (workspaceIds.length === 0) {
      return res.json({
        success: true,
        data: {
          onFire: [],
          inProgress: [],
          next: [],
          blocked: [],
          activeArtifacts: [],
          recentDecisions: [],
          stats: {
            totalTasks: 0,
            completedToday: 0,
            artifactsThisWeek: 0,
          },
        },
      });
    }

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch all tasks for the user's projects
    const allTasks = await prisma.task.findMany({
      where: {
        project: {
          userId,
        },
        status: {
          notIn: ['DONE'],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate priority scores and categorize
    const tasksWithScores = allTasks.map((task) => ({
      ...task,
      priorityScore: calculatePriorityScore(task),
    }));

    // ON FIRE: Overdue or due within 24h, high priority
    const onFire = tasksWithScores
      .filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate <= twentyFourHoursFromNow;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 5)
      .map(({ priorityScore, ...task }) => task);

    // IN PROGRESS: Currently being worked on
    const inProgress = tasksWithScores
      .filter((task) => task.status === 'IN_PROGRESS')
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 5)
      .map(({ priorityScore, ...task }) => task);

    // BLOCKED: Tasks that are blocked
    const blocked = tasksWithScores
      .filter((task) => task.status === 'BLOCKED')
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map(({ priorityScore, ...task }) => task);

    // NEXT: Top priority TODO tasks
    const next = tasksWithScores
      .filter(
        (task) =>
          task.status === 'TODO' &&
          !onFire.find((t) => t.id === task.id) // Don't duplicate "on fire" tasks
      )
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 3)
      .map(({ priorityScore, ...task }) => task);

    // ACTIVE ARTIFACTS: Recently accessed or pinned (last 7 days)
    const activeArtifacts = await prisma.artifact.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [
          { status: { in: ['DRAFT', 'REVIEW'] } },
          { updatedAt: { gte: sevenDaysAgo } },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        version: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // RECENT DECISIONS: Artifacts of type decision or with decision-like titles
    // (In future, we'll have a proper Decision model)
    const recentDecisions = await prisma.artifact.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [
          { title: { contains: 'decision', mode: 'insensitive' } },
          { title: { contains: 'choose', mode: 'insensitive' } },
          { title: { contains: 'decided', mode: 'insensitive' } },
          { tags: { hasSome: ['decision', 'strategy'] } },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // STATS
    const completedTodayCount = await prisma.task.count({
      where: {
        project: {
          userId,
        },
        completedAt: {
          gte: today,
        },
      },
    });

    const artifactsThisWeekCount = await prisma.artifact.count({
      where: {
        workspaceId: { in: workspaceIds },
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    res.json({
      success: true,
      data: {
        onFire,
        inProgress,
        next,
        blocked,
        activeArtifacts,
        recentDecisions,
        stats: {
          totalTasks: allTasks.length,
          completedToday: completedTodayCount,
          artifactsThisWeek: artifactsThisWeekCount,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
});

/**
 * @swagger
 * /api/dashboard/session-summary:
 *   get:
 *     summary: Get current session summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of session (ISO timestamp)
 *     responses:
 *       200:
 *         description: Session summary retrieved
 */
router.get('/dashboard/session-summary', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { since } = req.query;

    // Default to "today" if no since parameter
    const sessionStart = since
      ? new Date(since as string)
      : new Date(new Date().setHours(0, 0, 0, 0));

    // Get user's workspaces
    const workspaces = await prisma.workspace.findMany({
      where: { userId, status: 'active' },
      select: { id: true },
    });
    const workspaceIds = workspaces.map((w) => w.id);

    // Artifacts created this session
    const artifactsCreated = await prisma.artifact.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        createdAt: { gte: sessionStart },
      },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Artifacts edited this session
    const artifactsEdited = await prisma.artifact.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        updatedAt: { gte: sessionStart },
        createdAt: { lt: sessionStart }, // Only count edits, not new creations
      },
      select: {
        id: true,
        title: true,
        type: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Tasks created this session
    const tasksCreated = await prisma.task.findMany({
      where: {
        project: {
          userId,
        },
        createdAt: { gte: sessionStart },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Tasks completed this session
    const tasksCompleted = await prisma.task.findMany({
      where: {
        project: {
          userId,
        },
        completedAt: { gte: sessionStart },
      },
      select: {
        id: true,
        title: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // Decisions made this session (decision-tagged artifacts)
    const decisions = artifactsCreated.filter(
      (a) =>
        a.title.toLowerCase().includes('decision') ||
        a.title.toLowerCase().includes('choose')
    );

    // Open threads (conversations without closure - placeholder for future)
    const openThreads = []; // TODO: Implement conversation tracking

    res.json({
      success: true,
      data: {
        sessionStart,
        summary: {
          artifactsCreated: artifactsCreated.length,
          artifactsEdited: artifactsEdited.length,
          tasksCreated: tasksCreated.length,
          tasksCompleted: tasksCompleted.length,
          decisionsMade: decisions.length,
        },
        details: {
          artifactsCreated,
          artifactsEdited,
          tasksCreated,
          tasksCompleted,
          decisions,
          openThreads,
        },
      },
    });
  } catch (error) {
    console.error('Session summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session summary',
    });
  }
});

export default router;
