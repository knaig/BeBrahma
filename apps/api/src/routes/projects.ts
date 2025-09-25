import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { broadcastProjectUpdate, broadcastBoardUpdate } from '../websocket/index.js';

const router = express.Router();
const prisma = new PrismaClient();

// Request validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  selectedSolution: z.string().optional(),
  conversationId: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  selectedSolution: z.string().optional(),
  workflowStep: z.enum([
    'PROBLEM_CAPTURE',
    'PROBLEM_CLARIFICATION', 
    'SOLUTION_BRAINSTORM',
    'COMPETITOR_ANALYSIS',
    'SCA_ANALYSIS',
    'MVP_PLANNING',
    'TASK_GENERATION'
  ]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

// GET /api/projects - List user's projects with pagination and filtering
/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List user's projects
 *     description: Get paginated list of projects for authenticated user with optional filtering
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search projects by name
 *       - in: query
 *         name: workflowStep
 *         schema:
 *           type: string
 *           enum: [PROBLEM_CAPTURE, PROBLEM_CLARIFICATION, SOLUTION_BRAINSTORM, COMPETITOR_ANALYSIS, SCA_ANALYSIS, MVP_PLANNING, TASK_GENERATION]
 *         description: Filter by workflow step
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 */
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const search = req.query.search as string;
    const workflowStep = req.query.workflowStep as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (workflowStep) {
      where.workflowStep = workflowStep;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          boards: {
            include: {
              tasks: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              boards: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    const projectsWithStats = projects.map(project => ({
      ...project,
      stats: {
        totalTasks: project._count.tasks,
        totalBoards: project._count.boards,
        completedTasks: project.tasks.filter(t => t.status === 'DONE').length,
        boardStats: project.boards.map(board => ({
          boardId: board.id,
          boardName: board.name,
          taskCounts: {
            TODO: board.tasks.filter(t => t.status === 'TODO').length,
            IN_PROGRESS: board.tasks.filter(t => t.status === 'IN_PROGRESS').length,
            IN_REVIEW: board.tasks.filter(t => t.status === 'IN_REVIEW').length,
            DONE: board.tasks.filter(t => t.status === 'DONE').length,
            BLOCKED: board.tasks.filter(t => t.status === 'BLOCKED').length,
          },
        })),
      },
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      projects: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Projects list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

// POST /api/projects - Create new project with board initialization
/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     description: Creates a new project and initializes a default board
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               selectedSolution:
 *                 type: string
 *               conversationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const validation = createProjectSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { name, selectedSolution, conversationId } = validation.data;

    // Create project with default board in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          userId,
          name,
          selectedSolution,
          conversationId,
          workflowStep: 'PROBLEM_CAPTURE',
          progress: 0,
        },
      });

      // Create default board
      const defaultBoard = await tx.board.create({
        data: {
          projectId: newProject.id,
          name: 'Main Board',
          description: 'Default project board',
          settings: {
            columns: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
            autoAssign: false,
          },
        },
      });

      return { ...newProject, boards: [defaultBoard] };
    });

    // Broadcast project creation
    try {
      broadcastProjectUpdate(userId, 'project_created', project);
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.status(201).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

// GET /api/projects/:id - Get detailed project view
/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project details
 *     description: Get detailed information about a specific project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project details retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: {
        boards: {
          include: {
            tasks: {
              include: {
                dependencies: {
                  include: {
                    dependsOn: true,
                  },
                },
                dependents: {
                  include: {
                    task: true,
                  },
                },
              },
              orderBy: { position: 'asc' },
            },
          },
        },
        conversation: true,
        problems: true,
        solutions: true,
        competitors: true,
        scaFactors: true,
        mvpFeatures: true,
        _count: {
          select: {
            tasks: true,
            boards: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Calculate project statistics
    const allTasks = project.boards.flatMap(board => board.tasks);
    const stats = {
      totalTasks: allTasks.length,
      totalBoards: project.boards.length,
      tasksByStatus: {
        TODO: allTasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
        IN_REVIEW: allTasks.filter(t => t.status === 'IN_REVIEW').length,
        DONE: allTasks.filter(t => t.status === 'DONE').length,
        BLOCKED: allTasks.filter(t => t.status === 'BLOCKED').length,
      },
      overdueTasks: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
      recentActivity: allTasks
        .filter(t => t.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .length,
    };

    res.json({
      success: true,
      project: {
        ...project,
        stats,
      },
    });
  } catch (error) {
    console.error('Project detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project details',
    });
  }
});

// PUT /api/projects/:id - Update project
/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     description: Updates project information
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 */
router.put('/projects/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const validation = updateProjectSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
      include: {
        boards: {
          include: {
            tasks: true,
          },
        },
      },
    });

    // Broadcast project update
    try {
      broadcastProjectUpdate(userId, 'project_updated', project);
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Project update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

// DELETE /api/projects/:id - Delete project
/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     description: Permanently deletes a project and all associated data
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 */
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    await prisma.project.delete({
      where: { id },
    });

    // Broadcast project deletion
    try {
      broadcastProjectUpdate(userId, 'project_deleted', { id });
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Project deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

// GET /api/projects/:id/boards - List project boards
/**
 * @swagger
 * /api/projects/{id}/boards:
 *   get:
 *     summary: Get project boards
 *     description: Get all boards for a specific project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Boards retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id/boards', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const boards = await prisma.board.findMany({
      where: { projectId: id },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const boardsWithStats = boards.map(board => ({
      ...board,
      stats: {
        totalTasks: board._count.tasks,
        tasksByStatus: {
          TODO: board.tasks.filter(t => t.status === 'TODO').length,
          IN_PROGRESS: board.tasks.filter(t => t.status === 'IN_PROGRESS').length,
          IN_REVIEW: board.tasks.filter(t => t.status === 'IN_REVIEW').length,
          DONE: board.tasks.filter(t => t.status === 'DONE').length,
          BLOCKED: board.tasks.filter(t => t.status === 'BLOCKED').length,
        },
      },
    }));

    res.json({
      success: true,
      boards: boardsWithStats,
    });
  } catch (error) {
    console.error('Project boards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project boards',
    });
  }
});

// POST /api/projects/:id/boards - Create new board
/**
 * @swagger
 * /api/projects/{id}/boards:
 *   post:
 *     summary: Create a new board
 *     description: Creates a new board within a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Board created successfully
 *       404:
 *         description: Project not found
 */
router.post('/projects/:id/boards', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id: projectId } = req.params;

    const validation = createBoardSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const { name, description, settings } = validation.data;

    const board = await prisma.board.create({
      data: {
        projectId,
        name,
        description,
        settings: settings || {
          columns: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
          autoAssign: false,
        },
      },
      include: {
        tasks: true,
      },
    });

    // Broadcast board creation
    try {
      broadcastBoardUpdate(userId, 'board_created', board);
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.status(201).json({
      success: true,
      board,
    });
  } catch (error) {
    console.error('Board creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create board',
    });
  }
});

// GET /api/projects/:id/progress - Get project progress analytics
/**
 * @swagger
 * /api/projects/{id}/progress:
 *   get:
 *     summary: Get project progress analytics
 *     description: Get detailed progress metrics and analytics for a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Progress analytics retrieved successfully
 */
router.get('/projects/:id/progress', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const timeRange = req.query.timeRange as string || '30d';

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Calculate time range
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [tasks, boards] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: id },
        include: {
          dependencies: true,
          dependents: true,
        },
      }),
      prisma.board.findMany({
        where: { projectId: id },
        include: {
          tasks: true,
        },
      }),
    ]);

    // Calculate metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate velocity (tasks completed in time range)
    const recentCompletions = tasks.filter(t => 
      t.completedAt && 
      new Date(t.completedAt) >= startDate
    ).length;

    // Calculate burndown data
    const burndownData = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const completedByDate = tasks.filter(t =>
        t.completedAt && new Date(t.completedAt) <= date
      ).length;
      
      burndownData.push({
        date: date.toISOString().split('T')[0],
        remaining: totalTasks - completedByDate,
        completed: completedByDate,
      });
    }

    // Board-specific metrics
    const boardMetrics = boards.map(board => ({
      boardId: board.id,
      boardName: board.name,
      totalTasks: board.tasks.length,
      completedTasks: board.tasks.filter(t => t.status === 'DONE').length,
      completionRate: board.tasks.length > 0 
        ? (board.tasks.filter(t => t.status === 'DONE').length / board.tasks.length) * 100 
        : 0,
      taskDistribution: {
        TODO: board.tasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: board.tasks.filter(t => t.status === 'IN_PROGRESS').length,
        IN_REVIEW: board.tasks.filter(t => t.status === 'IN_REVIEW').length,
        DONE: board.tasks.filter(t => t.status === 'DONE').length,
        BLOCKED: board.tasks.filter(t => t.status === 'BLOCKED').length,
      },
    }));

    res.json({
      success: true,
      progress: {
        overview: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          blockedTasks,
          overdueTasks,
          completionRate: Math.round(completionRate * 100) / 100,
          velocity: recentCompletions,
        },
        burndown: burndownData,
        boardMetrics,
        timeRange,
      },
    });
  } catch (error) {
    console.error('Project progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project progress',
    });
  }
});

export default router;