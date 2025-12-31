import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  objectives: z.array(z.string()).optional().default([]),
  constraints: z.array(z.string()).optional().default([]),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  objectives: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
});

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspace]
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
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *               constraints:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Workspace created successfully
 */
router.post('/workspaces', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    const validation = createWorkspaceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { name, slug, description, objectives, constraints } = validation.data;

    // Check if slug already exists
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Workspace with this slug already exists',
      });
    }

    const workspace = await prisma.workspace.create({
      data: {
        userId,
        name,
        slug,
        description,
        objectives,
        constraints,
        status: 'active',
      },
    });

    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Workspace creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workspace',
    });
  }
});

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     summary: List user's workspaces
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspaces retrieved successfully
 */
router.get('/workspaces', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    const workspaces = await prisma.workspace.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            artifacts: true,
            playbooks: true,
            scoreboards: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    console.error('Workspaces list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workspaces',
    });
  }
});

/**
 * @swagger
 * /api/workspaces/{slug}:
 *   get:
 *     summary: Get workspace by slug
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace retrieved successfully
 *       404:
 *         description: Workspace not found
 */
router.get('/workspaces/:slug', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { slug } = req.params;

    const workspace = await prisma.workspace.findFirst({
      where: { slug, userId },
      include: {
        _count: {
          select: {
            artifacts: true,
            playbooks: true,
            scoreboards: true,
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    res.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Workspace detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workspace',
    });
  }
});

/**
 * @swagger
 * /api/workspaces/{slug}:
 *   put:
 *     summary: Update workspace
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 */
router.put('/workspaces/:slug', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { slug } = req.params;

    const validation = updateWorkspaceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { slug, userId },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Workspace update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workspace',
    });
  }
});

/**
 * @swagger
 * /api/workspaces/{slug}:
 *   delete:
 *     summary: Delete workspace (soft delete to archived status)
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 */
router.delete('/workspaces/:slug', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { slug } = req.params;

    const workspace = await prisma.workspace.findFirst({
      where: { slug, userId },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    // Soft delete: archive instead of hard delete
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: 'archived' },
    });

    res.json({
      success: true,
      message: 'Workspace archived successfully',
    });
  } catch (error) {
    console.error('Workspace deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workspace',
    });
  }
});

export default router;
