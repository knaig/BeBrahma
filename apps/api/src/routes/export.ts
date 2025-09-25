import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { exportService } from '../services/exportService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Request validation schemas
const exportProjectSchema = z.object({
  format: z.enum(['pdf', 'markdown', 'json']),
  sections: z.array(z.string()).optional(),
  template: z.string().optional(),
  includeImages: z.boolean().default(false),
  includeTasks: z.boolean().default(true),
  includeProgress: z.boolean().default(true),
  includeTimeline: z.boolean().default(false),
});

const exportTasksSchema = z.object({
  format: z.enum(['csv', 'pdf', 'json']),
  filters: z.object({
    status: z.array(z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'])).optional(),
    priority: z.array(z.string()).optional(),
    assigneeId: z.string().optional(),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
    category: z.string().optional(),
  }).optional(),
  includeDependencies: z.boolean().default(false),
  includeProgress: z.boolean().default(true),
});

const exportDocumentationSchema = z.object({
  type: z.enum(['user_guide', 'technical_docs', 'api_docs', 'workflow_guide']),
  format: z.enum(['pdf', 'markdown', 'html']),
  includeScreenshots: z.boolean().default(false),
  includeCodeExamples: z.boolean().default(true),
  template: z.string().optional(),
});

const customExportSchema = z.object({
  name: z.string().min(1).max(255),
  format: z.enum(['pdf', 'markdown', 'csv', 'json', 'html']),
  template: z.string().optional(),
  sections: z.array(z.string()),
  filters: z.record(z.any()).optional(),
  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
});

// Helper function to verify user access to project
async function verifyProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  return !!project;
}

// Helper function to verify user access to board
async function verifyBoardAccess(userId: string, boardId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId },
    include: { project: true },
  });
  return board && await verifyProjectAccess(userId, board.projectId);
}

// POST /api/export/project/:id - Generate comprehensive project export
/**
 * @swagger
 * /api/export/project/{id}:
 *   post:
 *     summary: Export project data
 *     description: Generates a comprehensive export of project data in various formats
 *     tags: [Export]
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
 *               - format
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [pdf, markdown, json]
 *               sections:
 *                 type: array
 *                 items:
 *                   type: string
 *               template:
 *                 type: string
 *               includeImages:
 *                 type: boolean
 *                 default: false
 *               includeTasks:
 *                 type: boolean
 *                 default: true
 *               includeProgress:
 *                 type: boolean
 *                 default: true
 *               includeTimeline:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Export generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exportId:
 *                   type: string
 *                 downloadUrl:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 size:
 *                   type: integer
 *       404:
 *         description: Project not found
 *       400:
 *         description: Invalid export configuration
 */
router.post('/export/project/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id: projectId } = req.params;

    // Verify project access
    if (!await verifyProjectAccess(userId, projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
      });
    }

    const validation = exportProjectSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export configuration',
        details: validation.error.errors,
      });
    }

    const config = validation.data;

    // Fetch project data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        conversation: true,
        problems: true,
        solutions: true,
        competitors: true,
        scaFactors: true,
        mvpFeatures: true,
        boards: {
          include: {
            tasks: {
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
              orderBy: { position: 'asc' },
            },
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

    // Generate export
    const exportResult = await exportService.exportProject(project, config, userId);

    res.json({
      success: true,
      exportId: exportResult.exportId,
      downloadUrl: `/api/export/download/${exportResult.exportId}`,
      filename: exportResult.filename,
      format: config.format,
      size: exportResult.size,
      expiresAt: exportResult.expiresAt,
    });
  } catch (error) {
    console.error('Project export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export project',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/export/tasks/:boardId - Export task list with filtering options
/**
 * @swagger
 * /api/export/tasks/{boardId}:
 *   post:
 *     summary: Export board tasks
 *     description: Exports tasks from a board with filtering and formatting options
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: Board ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - format
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [csv, pdf, json]
 *               filters:
 *                 type: object
 *               includeDependencies:
 *                 type: boolean
 *                 default: false
 *               includeProgress:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Tasks exported successfully
 *       404:
 *         description: Board not found
 */
router.post('/export/tasks/:boardId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { boardId } = req.params;

    // Verify board access
    if (!await verifyBoardAccess(userId, boardId)) {
      return res.status(404).json({
        success: false,
        error: 'Board not found or access denied',
      });
    }

    const validation = exportTasksSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export configuration',
        details: validation.error.errors,
      });
    }

    const config = validation.data;

    // Build task query with filters
    const where: any = { boardId };
    if (config.filters?.status?.length) {
      where.status = { in: config.filters.status };
    }
    if (config.filters?.priority?.length) {
      where.priority = { in: config.filters.priority };
    }
    if (config.filters?.assigneeId) {
      where.assigneeId = config.filters.assigneeId;
    }
    if (config.filters?.category) {
      where.category = { contains: config.filters.category, mode: 'insensitive' };
    }
    if (config.filters?.dateRange?.start || config.filters?.dateRange?.end) {
      where.createdAt = {};
      if (config.filters.dateRange.start) {
        where.createdAt.gte = new Date(config.filters.dateRange.start);
      }
      if (config.filters.dateRange.end) {
        where.createdAt.lte = new Date(config.filters.dateRange.end);
      }
    }

    // Fetch tasks with optional dependencies
    const tasks = await prisma.task.findMany({
      where,
      include: {
        dependencies: config.includeDependencies ? {
          include: {
            dependsOn: {
              select: { id: true, title: true, status: true },
            },
          },
        } : false,
        dependents: config.includeDependencies ? {
          include: {
            task: {
              select: { id: true, title: true, status: true },
            },
          },
        } : false,
      },
      orderBy: { position: 'asc' },
    });

    // Generate export
    const exportResult = await exportService.exportTasks(tasks, config, userId);

    res.json({
      success: true,
      exportId: exportResult.exportId,
      downloadUrl: `/api/export/download/${exportResult.exportId}`,
      filename: exportResult.filename,
      format: config.format,
      taskCount: tasks.length,
      size: exportResult.size,
      expiresAt: exportResult.expiresAt,
    });
  } catch (error) {
    console.error('Tasks export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export tasks',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/export/documentation/:projectId - Generate user guides and docs
/**
 * @swagger
 * /api/export/documentation/{projectId}:
 *   post:
 *     summary: Generate project documentation
 *     description: Creates user guides and technical documentation for a project
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Documentation generated successfully
 *       404:
 *         description: Project not found
 */
router.post('/export/documentation/:projectId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;

    // Verify project access
    if (!await verifyProjectAccess(userId, projectId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
      });
    }

    const validation = exportDocumentationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid documentation configuration',
        details: validation.error.errors,
      });
    }

    const config = validation.data;

    // Fetch comprehensive project data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        conversation: true,
        problems: true,
        solutions: true,
        competitors: true,
        scaFactors: true,
        mvpFeatures: true,
        boards: {
          include: {
            tasks: {
              include: {
                dependencies: {
                  include: { dependsOn: true },
                },
              },
              orderBy: [{ status: 'asc' }, { position: 'asc' }],
            },
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

    // Generate documentation
    const exportResult = await exportService.exportDocumentation(project, config, userId);

    res.json({
      success: true,
      exportId: exportResult.exportId,
      downloadUrl: `/api/export/download/${exportResult.exportId}`,
      filename: exportResult.filename,
      documentType: config.type,
      format: config.format,
      size: exportResult.size,
      expiresAt: exportResult.expiresAt,
    });
  } catch (error) {
    console.error('Documentation generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate documentation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/export/templates - List available export templates
/**
 * @swagger
 * /api/export/templates:
 *   get:
 *     summary: Get export templates
 *     description: Lists all available export templates with their configurations
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [project, tasks, documentation]
 *         description: Filter templates by type
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, markdown, csv, json, html]
 *         description: Filter templates by format
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/export/templates', requireAuth, async (req, res) => {
  try {
    const type = req.query.type as string;
    const format = req.query.format as string;

    const templates = await exportService.getExportTemplates({ type, format });

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Templates fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export templates',
    });
  }
});

// POST /api/export/custom - Create custom export configuration
/**
 * @swagger
 * /api/export/custom:
 *   post:
 *     summary: Create custom export
 *     description: Creates a custom export with user-defined configuration and optional scheduling
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Custom export configuration created
 *       400:
 *         description: Invalid configuration
 */
router.post('/export/custom', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    const validation = customExportSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid custom export configuration',
        details: validation.error.errors,
      });
    }

    const config = validation.data;

    // Generate custom export
    const exportResult = await exportService.exportCustom(config, config, userId);

    res.json({
      success: true,
      exportId: exportResult.exportId,
      downloadUrl: `/api/export/download/${exportResult.exportId}`,
      filename: exportResult.filename,
      format: config.format,
      size: exportResult.size,
      expiresAt: exportResult.expiresAt,
    });
  } catch (error) {
    console.error('Custom export creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom export',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/export/history - Get user's export history
/**
 * @swagger
 * /api/export/history:
 *   get:
 *     summary: Get export history
 *     description: Retrieves the user's export history with pagination
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [project, tasks, documentation, custom]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, markdown, csv, json, html]
 *     responses:
 *       200:
 *         description: Export history retrieved successfully
 */
router.get('/export/history', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as string;
    const format = req.query.format as string;

    const history = await exportService.getExportHistory(userId, {
      page,
      limit,
      type,
      format,
    });

    res.json({
      success: true,
      ...history,
    });
  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export history',
    });
  }
});

// GET /api/export/download/:exportId - Download generated export file
/**
 * @swagger
 * /api/export/download/{exportId}:
 *   get:
 *     summary: Download export file
 *     description: Downloads a previously generated export file
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: exportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Export ID
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Export file not found or expired
 */
router.get('/export/download/:exportId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { exportId } = req.params;

    const downloadInfo = await exportService.getDownloadInfo(exportId, userId);

    if (!downloadInfo) {
      return res.status(404).json({
        success: false,
        error: 'Export file not found or expired',
      });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.filename}"`);
    res.setHeader('Content-Type', downloadInfo.contentType);
    res.setHeader('Content-Length', downloadInfo.size);

    // Stream the file
    await exportService.streamFile(downloadInfo.filePath, res);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/export/:exportId - Delete export file and record
router.delete('/export/:exportId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { exportId } = req.params;

    const deleted = await exportService.deleteExport(exportId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Export not found or access denied',
      });
    }

    res.json({
      success: true,
      message: 'Export deleted successfully',
    });
  } catch (error) {
    console.error('Export deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete export',
    });
  }
});

// GET /api/export/progress/:exportId - Check export generation progress
router.get('/export/progress/:exportId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { exportId } = req.params;

    const progress = await exportService.getExportProgress(exportId, userId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Export not found',
      });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Export progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export progress',
    });
  }
});

// POST /api/export/:exportId/share - Share export file with others
router.post('/export/:exportId/share', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { exportId } = req.params;
    const { recipients, message, expiresIn } = req.body;

    const shareInfo = await exportService.shareExport(exportId, userId, {
      recipients,
      message,
      expiresIn: expiresIn || '7d',
    });

    res.json({
      success: true,
      shareInfo,
    });
  } catch (error) {
    console.error('Export sharing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share export',
    });
  }
});

export default router;