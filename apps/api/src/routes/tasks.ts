import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { broadcastTaskUpdate, broadcastBoardUpdate } from '../websocket/index.js';

const router = express.Router();
const prisma = new PrismaClient();

// Request validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().min(1),
  priority: z.string().min(1),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).default('TODO'),
  position: z.number().int().default(0),
  estimatedHours: z.number().int().positive().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  boardId: z.string().optional(),
  dependencies: z.array(z.object({
    dependsOnId: z.string(),
    type: z.enum(['BLOCKS', 'RELATED', 'SUBTASK']).default('BLOCKS'),
  })).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  position: z.number().int().optional(),
  estimatedHours: z.number().int().positive().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  boardId: z.string().optional(),
});

const addDependencySchema = z.object({
  dependsOnId: z.string(),
  type: z.enum(['BLOCKS', 'RELATED', 'SUBTASK']).default('BLOCKS'),
});

const reorderTasksSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    position: z.number().int(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
    boardId: z.string().optional(),
  })),
});

// Helper function to check if adding dependency creates a cycle
async function wouldCreateCycle(taskId: string, dependsOnId: string): Promise<boolean> {
  if (taskId === dependsOnId) return true;

  const visited = new Set<string>();
  const stack: string[] = [dependsOnId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === taskId) return true;

    const dependencies = await prisma.taskDependency.findMany({
      where: { taskId: currentId },
      select: { dependsOnId: true },
    });

    for (const dep of dependencies) {
      stack.push(dep.dependsOnId);
    }
  }

  return false;
}

// Helper function to verify user has access to project
async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  return !!project;
}

// GET /api/tasks/board/:boardId - Fetch tasks by board with status grouping
/**
 * @swagger
 * /api/tasks/board/{boardId}:
 *   get:
 *     summary: Get tasks by board
 *     description: Fetch all tasks for a specific board grouped by status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *       - in: query
 *         name: includeDependencies
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include task dependencies in response
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tasks:
 *                   type: object
 *                   properties:
 *                     TODO:
 *                       type: array
 *                     IN_PROGRESS:
 *                       type: array
 *                     IN_REVIEW:
 *                       type: array
 *                     DONE:
 *                       type: array
 *                     BLOCKED:
 *                       type: array
 *       404:
 *         description: Board not found
 */
router.get('/tasks/board/:boardId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { boardId } = req.params;
    const includeDependencies = req.query.includeDependencies !== 'false';

    // Verify board exists and user has access
    const board = await prisma.board.findFirst({
      where: { id: boardId },
      include: { project: true },
    });

    if (!board || !await verifyProjectAccess(userId, board.projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Board not found or access denied',
      });
    }

    const tasks = await prisma.task.findMany({
      where: { boardId },
      include: {
        dependencies: includeDependencies ? {
          include: {
            dependsOn: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        } : false,
        dependents: includeDependencies ? {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        } : false,
      },
      orderBy: { position: 'asc' },
    });

    // Group tasks by status
    const groupedTasks = {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW'),
      DONE: tasks.filter(t => t.status === 'DONE'),
      BLOCKED: tasks.filter(t => t.status === 'BLOCKED'),
    };

    res.json({
      success: true,
      tasks: groupedTasks,
      boardId,
      boardName: board.name,
    });
  } catch (error) {
    console.error('Board tasks fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board tasks',
    });
  }
});

// POST /api/tasks - Create new task with dependency validation
/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     description: Creates a new task with optional dependencies
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - priority
 *               - projectId
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               priority:
 *                 type: string
 *               projectId:
 *                 type: string
 *               boardId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED]
 *               estimatedHours:
 *                 type: integer
 *               assigneeId:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Project not found
 */
router.post('/tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { projectId, ...taskData } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required',
      });
    }

    // Verify project access
    if (!await verifyProjectAccess(userId, projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
      });
    }

    const validation = createTaskSchema.safeParse(taskData);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // If boardId not provided, find default board
    let boardId = data.boardId;
    if (!boardId) {
      const defaultBoard = await prisma.board.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });
      boardId = defaultBoard?.id;
    }

    // Calculate next position in the status column
    const lastTask = await prisma.task.findFirst({
      where: {
        projectId,
        boardId,
        status: data.status,
      },
      orderBy: { position: 'desc' },
    });

    const position = data.position || (lastTask ? lastTask.position + 1 : 0);

    const task = await prisma.task.create({
      data: {
        ...data,
        projectId,
        boardId,
        position,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        dependencies: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        dependents: {
          include: {
            task: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    // Handle dependencies if provided
    if (data.dependencies && data.dependencies.length > 0) {
      const dependencyPromises = data.dependencies.map(async (dep) => {
        // Check for circular dependencies
        if (await wouldCreateCycle(task.id, dep.dependsOnId, projectId)) {
          throw new Error(`Circular dependency detected with task ${dep.dependsOnId}`);
        }

        // Verify the dependency task exists and belongs to the same project
        const dependsOnTask = await prisma.task.findFirst({
          where: { id: dep.dependsOnId, projectId },
        });

        if (!dependsOnTask) {
          throw new Error(`Dependency task ${dep.dependsOnId} not found or not in same project`);
        }

        // Create the dependency
        return prisma.taskDependency.create({
          data: {
            taskId: task.id,
            dependsOnId: dep.dependsOnId,
            type: dep.type,
          },
        });
      });

      try {
        await Promise.all(dependencyPromises);
        
        // Refresh task with dependencies
        const updatedTask = await prisma.task.findUnique({
          where: { id: task.id },
          include: {
            dependencies: {
              include: {
                dependsOn: {
                  select: { id: true, title: true, status: true },
                },
              },
            },
            dependents: {
              include: {
                task: {
                  select: { id: true, title: true, status: true },
                },
              },
            },
          },
        });

        if (updatedTask) {
          // Update the task reference for broadcasting
          Object.assign(task, updatedTask);
        }
      } catch (depError) {
        // If dependency creation fails, delete the task and return error
        await prisma.task.delete({ where: { id: task.id } });
        throw depError;
      }
    }

    // Broadcast task creation
    try {
      broadcastTaskUpdate(userId, 'task_created', task);
      if (boardId) {
        broadcastBoardUpdate(userId, 'board_updated', { boardId, action: 'task_added' });
      }
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
    });
  }
});

// PUT /api/tasks/:id - Update task including status changes and assignment
/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     description: Updates task information including status, assignment, and position
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 */
router.put('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const validation = updateTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    // Verify task exists and user has access
    const existingTask = await prisma.task.findFirst({
      where: { id },
      include: { project: true },
    });

    if (!existingTask || !await verifyProjectAccess(userId, existingTask.projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied',
      });
    }

    const data = validation.data;
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Handle due date
    if ('dueDate' in data) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Handle completion
    if (data.status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date();
    } else if (data.status !== 'DONE' && existingTask.status === 'DONE') {
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        dependencies: {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        dependents: {
          include: {
            task: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
    });

    // Broadcast task update
    try {
      broadcastTaskUpdate(userId, 'task_updated', task);
      if (task.boardId) {
        broadcastBoardUpdate(userId, 'board_updated', { 
          boardId: task.boardId, 
          action: 'task_updated',
          taskId: task.id,
        });
      }
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
    });
  }
});

// DELETE /api/tasks/:id - Delete task with dependency cleanup
/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Permanently deletes a task and cleans up its dependencies
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
router.delete('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Verify task exists and user has access
    const existingTask = await prisma.task.findFirst({
      where: { id },
      include: { project: true },
    });

    if (!existingTask || !await verifyProjectAccess(userId, existingTask.projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied',
      });
    }

    const boardId = existingTask.boardId;

    await prisma.task.delete({
      where: { id },
    });

    // Broadcast task deletion
    try {
      broadcastTaskUpdate(userId, 'task_deleted', { id, projectId: existingTask.projectId });
      if (boardId) {
        broadcastBoardUpdate(userId, 'board_updated', { 
          boardId, 
          action: 'task_deleted',
          taskId: id,
        });
      }
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Task deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
    });
  }
});

// POST /api/tasks/:id/dependencies - Add task dependency
/**
 * @swagger
 * /api/tasks/{id}/dependencies:
 *   post:
 *     summary: Add task dependency
 *     description: Creates a dependency relationship between tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dependsOnId
 *             properties:
 *               dependsOnId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [BLOCKS, RELATED, SUBTASK]
 *                 default: BLOCKS
 *     responses:
 *       201:
 *         description: Dependency created successfully
 *       400:
 *         description: Would create circular dependency
 *       404:
 *         description: Task not found
 */
router.post('/tasks/:id/dependencies', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id: taskId } = req.params;

    const validation = addDependencySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { dependsOnId, type } = validation.data;

    // Verify both tasks exist and user has access
    const [task, dependsOnTask] = await Promise.all([
      prisma.task.findFirst({
        where: { id: taskId },
        include: { project: true },
      }),
      prisma.task.findFirst({
        where: { id: dependsOnId },
        include: { project: true },
      }),
    ]);

    if (!task || !await verifyProjectAccess(userId, task.projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied',
      });
    }

    if (!dependsOnTask || !await verifyProjectAccess(userId, dependsOnTask.projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Dependency target task not found or access denied',
      });
    }

    // Check for circular dependency
    if (await wouldCreateCycle(taskId, dependsOnId)) {
      return res.status(400).json({
        success: false,
        error: 'Adding this dependency would create a circular dependency',
      });
    }

    // Check if dependency already exists
    const existingDependency = await prisma.taskDependency.findUnique({
      where: {
        taskId_dependsOnId: {
          taskId,
          dependsOnId,
        },
      },
    });

    if (existingDependency) {
      return res.status(400).json({
        success: false,
        error: 'Dependency already exists',
      });
    }

    const dependency = await prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnId,
        type,
      },
      include: {
        task: {
          select: { id: true, title: true, status: true },
        },
        dependsOn: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    // Broadcast dependency update
    try {
      broadcastTaskUpdate(userId, 'dependency_added', {
        taskId,
        dependsOnId,
        type,
        dependency,
      });
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.status(201).json({
      success: true,
      dependency,
    });
  } catch (error) {
    console.error('Add dependency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add task dependency',
    });
  }
});

// GET /api/tasks/:id/dependencies - Get dependency graph for task
/**
 * @swagger
 * /api/tasks/{id}/dependencies:
 *   get:
 *     summary: Get task dependency graph
 *     description: Retrieves the complete dependency graph for a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           default: 3
 *           maximum: 10
 *         description: Maximum depth for dependency traversal
 *     responses:
 *       200:
 *         description: Dependency graph retrieved successfully
 *       404:
 *         description: Task not found
 */
router.get('/tasks/:id/dependencies', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id: taskId } = req.params;
    const maxDepth = Math.min(parseInt(req.query.depth as string) || 3, 10);

    // Verify task exists and user has access
    const task = await prisma.task.findFirst({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || !await verifyProjectAccess(userId, task.projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied',
      });
    }

    // Build dependency graph using BFS
    const visited = new Set<string>();
    const nodes = new Map();
    const edges = [];
    const queue = [{ id: taskId, depth: 0 }];

    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()!;
      
      if (visited.has(currentId) || depth > maxDepth) continue;
      visited.add(currentId);

      // Get current task details
      const currentTask = await prisma.task.findUnique({
        where: { id: currentId },
        include: {
          dependencies: {
            include: {
              dependsOn: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          dependents: {
            include: {
              task: {
                select: { id: true, title: true, status: true },
              },
            },
          },
        },
      });

      if (!currentTask) continue;

      // Add node
      nodes.set(currentId, {
        id: currentTask.id,
        title: currentTask.title,
        status: currentTask.status,
        priority: currentTask.priority,
        assigneeId: currentTask.assigneeId,
        dueDate: currentTask.dueDate,
        completedAt: currentTask.completedAt,
        depth,
      });

      // Process dependencies (incoming edges)
      for (const dep of currentTask.dependencies) {
        edges.push({
          from: dep.dependsOnId,
          to: currentId,
          type: dep.type,
        });

        if (!visited.has(dep.dependsOnId) && depth < maxDepth) {
          queue.push({ id: dep.dependsOnId, depth: depth + 1 });
        }
      }

      // Process dependents (outgoing edges)
      for (const dep of currentTask.dependents) {
        edges.push({
          from: currentId,
          to: dep.taskId,
          type: dep.type,
        });

        if (!visited.has(dep.taskId) && depth < maxDepth) {
          queue.push({ id: dep.taskId, depth: depth + 1 });
        }
      }
    }

    // Calculate critical path and bottlenecks
    const blockedTasks = Array.from(nodes.values()).filter(node => 
      edges.some(edge => edge.to === node.id && edge.type === 'BLOCKS')
    );

    res.json({
      success: true,
      graph: {
        rootTaskId: taskId,
        nodes: Array.from(nodes.values()),
        edges,
        stats: {
          totalNodes: nodes.size,
          totalEdges: edges.length,
          blockedTasks: blockedTasks.length,
          maxDepth,
        },
      },
    });
  } catch (error) {
    console.error('Dependency graph error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dependency graph',
    });
  }
});

// DELETE /api/tasks/:taskId/dependencies/:dependsOnId - Remove dependency
router.delete('/tasks/:taskId/dependencies/:dependsOnId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { taskId, dependsOnId } = req.params;

    // Verify task exists and user has access
    const task = await prisma.task.findFirst({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || !await verifyProjectAccess(userId, task.projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied',
      });
    }

    const dependency = await prisma.taskDependency.findUnique({
      where: {
        taskId_dependsOnId: {
          taskId,
          dependsOnId,
        },
      },
    });

    if (!dependency) {
      return res.status(404).json({
        success: false,
        error: 'Dependency not found',
      });
    }

    await prisma.taskDependency.delete({
      where: {
        taskId_dependsOnId: {
          taskId,
          dependsOnId,
        },
      },
    });

    // Broadcast dependency removal
    try {
      broadcastTaskUpdate(userId, 'dependency_removed', {
        taskId,
        dependsOnId,
      });
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({
      success: true,
      message: 'Dependency removed successfully',
    });
  } catch (error) {
    console.error('Remove dependency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove task dependency',
    });
  }
});

// PUT /api/tasks/reorder - Bulk position updates for drag-and-drop
/**
 * @swagger
 * /api/tasks/reorder:
 *   put:
 *     summary: Reorder tasks in bulk
 *     description: Updates positions and statuses of multiple tasks for drag-and-drop operations
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tasks
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - position
 *                   properties:
 *                     id:
 *                       type: string
 *                     position:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED]
 *                     boardId:
 *                       type: string
 *     responses:
 *       200:
 *         description: Tasks reordered successfully
 *       400:
 *         description: Invalid request data
 */
router.put('/tasks/reorder', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    const validation = reorderTasksSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { tasks } = validation.data;

    // Verify all tasks exist and user has access
    const taskIds = tasks.map(t => t.id);
    const existingTasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: { project: true },
    });

    for (const task of existingTasks) {
      if (!await verifyProjectAccess(userId, task.projectId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to one or more tasks',
        });
      }
    }

    if (existingTasks.length !== tasks.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more tasks not found',
      });
    }

    // Update tasks in a transaction
    const updatedTasks = await prisma.$transaction(
      tasks.map(({ id, position, status, boardId }) => {
        const updateData: any = {
          position,
          updatedAt: new Date(),
        };

        if (status !== undefined) {
          updateData.status = status;
          
          // Handle completion status
          const existingTask = existingTasks.find(t => t.id === id);
          if (status === 'DONE' && existingTask?.status !== 'DONE') {
            updateData.completedAt = new Date();
          } else if (status !== 'DONE' && existingTask?.status === 'DONE') {
            updateData.completedAt = null;
          }
        }

        if (boardId !== undefined) {
          updateData.boardId = boardId;
        }

        return prisma.task.update({
          where: { id },
          data: updateData,
          include: {
            dependencies: {
              include: {
                dependsOn: {
                  select: { id: true, title: true, status: true },
                },
              },
            },
            dependents: {
              include: {
                task: {
                  select: { id: true, title: true, status: true },
                },
              },
            },
          },
        });
      })
    );

    // Broadcast bulk update
    try {
      broadcastTaskUpdate(userId, 'tasks_reordered', {
        tasks: updatedTasks,
        operation: 'bulk_reorder',
      });

      // Broadcast board updates for affected boards
      const affectedBoards = new Set();
      for (const task of updatedTasks) {
        if (task.boardId) {
          affectedBoards.add(task.boardId);
        }
      }

      for (const boardId of affectedBoards) {
        broadcastBoardUpdate(userId, 'board_updated', {
          boardId,
          action: 'tasks_reordered',
        });
      }
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
    }

    res.json({
      success: true,
      tasks: updatedTasks,
    });
  } catch (error) {
    console.error('Task reorder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder tasks',
    });
  }
});

export default router;