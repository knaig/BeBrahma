import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createArtifactSchema = z.object({
  workspaceId: z.string().optional(), // Optional, can be inferred from workspace slug
  title: z.string().min(1).max(255),
  type: z.enum([
    'PLAYBOOK',
    'PILOT_PACK',
    'PRD',
    'PITCH',
    'OUTREACH_EMAIL',
    'MODEL_SHEET',
    'MEETING_NOTES',
    'CONTRACT',
    'RESEARCH_NOTE',
    'DESIGN_DOC',
    'TEST_PLAN',
    'OTHER',
  ]),
  content: z.string(),
  tags: z.array(z.string()).optional().default([]),
  status: z
    .enum(['DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'SIGNED', 'ARCHIVED'])
    .optional()
    .default('DRAFT'),
  source: z.string().optional(), // e.g., "conversation:abc123"
  parentId: z.string().optional(), // For versioning
});

const updateArtifactSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z
    .enum(['DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'SIGNED', 'ARCHIVED'])
    .optional(),
});

// Helper: Calculate content hash (SHA-256)
function calculateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper: Generate search vector (simplified - should use Postgres function)
function generateSearchVector(title: string, content: string, tags: string[]): string {
  return `${title} ${content} ${tags.join(' ')}`.toLowerCase();
}

// Helper: Verify workspace access
async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
  });
  return !!workspace;
}

/**
 * @swagger
 * /api/artifacts:
 *   post:
 *     summary: Create a new artifact
 *     tags: [Artifacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Artifact created successfully
 */
router.post('/artifacts', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    const validation = createArtifactSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    let { workspaceId, title, type, content, tags, status, source, parentId } =
      validation.data;

    // If workspaceId not provided, use user's first active workspace
    if (!workspaceId) {
      const defaultWorkspace = await prisma.workspace.findFirst({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultWorkspace) {
        return res.status(400).json({
          success: false,
          error: 'No active workspace found. Please create a workspace first.',
        });
      }

      workspaceId = defaultWorkspace.id;
    }

    // Verify workspace access
    if (!(await verifyWorkspaceAccess(userId, workspaceId))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace',
      });
    }

    // Calculate content hash
    const contentHash = calculateContentHash(content);

    // Check for duplicate content (warning only, don't block)
    const duplicate = await prisma.artifact.findFirst({
      where: { workspaceId, contentHash },
      select: { id: true, title: true, version: true },
    });

    // Determine version number
    let version = 1;
    let lineage: string[] = [];

    if (parentId) {
      // This is a new version of an existing artifact
      const parent = await prisma.artifact.findFirst({
        where: { id: parentId, workspaceId },
      });

      if (!parent) {
        return res.status(404).json({
          success: false,
          error: 'Parent artifact not found',
        });
      }

      version = parent.version + 1;
      lineage = Array.isArray(parent.lineage)
        ? [...parent.lineage, parentId]
        : [parentId];
    }

    // Generate search vector
    const searchVector = generateSearchVector(title, content, tags);

    const artifact = await prisma.artifact.create({
      data: {
        workspaceId,
        title,
        type,
        content,
        contentHash,
        tags,
        status,
        source,
        parentId,
        version,
        lineage,
        searchVector,
        createdBy: userId,
      },
      include: {
        parent: {
          select: {
            id: true,
            title: true,
            version: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: artifact,
      warnings: duplicate
        ? [`Similar content exists: "${duplicate.title}" (v${duplicate.version})`]
        : [],
    });
  } catch (error) {
    console.error('Artifact creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create artifact',
    });
  }
});

/**
 * @swagger
 * /api/artifacts:
 *   get:
 *     summary: List artifacts with filtering
 *     tags: [Artifacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *           enum: [active, reference, archive]
 *     responses:
 *       200:
 *         description: Artifacts retrieved successfully
 */
router.get('/artifacts', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { workspaceId, type, status, tier, tags } = req.query;

    // Build where clause
    const where: any = {};

    if (workspaceId) {
      // Verify access
      if (!(await verifyWorkspaceAccess(userId, workspaceId as string))) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this workspace',
        });
      }
      where.workspaceId = workspaceId;
    } else {
      // Get all workspaces for this user
      const workspaces = await prisma.workspace.findMany({
        where: { userId },
        select: { id: true },
      });
      where.workspaceId = { in: workspaces.map((w) => w.id) };
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (tags) {
      const tagArray = (tags as string).split(',');
      where.tags = { hasSome: tagArray };
    }

    // Tier-based filtering (tiered document system)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (tier === 'active') {
      where.OR = [
        { status: 'DRAFT' },
        { status: 'REVIEW' },
        { updatedAt: { gte: sevenDaysAgo } },
      ];
    } else if (tier === 'reference') {
      where.updatedAt = { gte: thirtyDaysAgo, lt: sevenDaysAgo };
      where.status = { notIn: ['DRAFT', 'REVIEW'] };
    } else if (tier === 'archive') {
      where.OR = [
        { updatedAt: { lt: thirtyDaysAgo } },
        { status: 'ARCHIVED' },
      ];
    }

    const artifacts = await prisma.artifact.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        version: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        source: true,
        parent: {
          select: {
            id: true,
            title: true,
            version: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: artifacts,
    });
  } catch (error) {
    console.error('Artifacts list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artifacts',
    });
  }
});

/**
 * @swagger
 * /api/artifacts/{id}:
 *   get:
 *     summary: Get artifact detail
 *     tags: [Artifacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artifact retrieved successfully
 */
router.get('/artifacts/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const artifact = await prisma.artifact.findFirst({
      where: { id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            userId: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
          },
          orderBy: { version: 'asc' },
        },
      },
    });

    if (!artifact) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found',
      });
    }

    // Verify access
    if (artifact.workspace.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this artifact',
      });
    }

    res.json({
      success: true,
      data: artifact,
    });
  } catch (error) {
    console.error('Artifact detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch artifact',
    });
  }
});

/**
 * @swagger
 * /api/artifacts/{id}:
 *   put:
 *     summary: Update artifact
 *     tags: [Artifacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artifact updated successfully
 */
router.put('/artifacts/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const validation = updateArtifactSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    // Verify artifact exists and user has access
    const existing = await prisma.artifact.findFirst({
      where: { id },
      include: { workspace: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found',
      });
    }

    if (existing.workspace.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this artifact',
      });
    }

    const updateData: any = {
      ...validation.data,
      updatedAt: new Date(),
    };

    // Recalculate content hash and search vector if content changed
    if (validation.data.content) {
      updateData.contentHash = calculateContentHash(validation.data.content);
      updateData.searchVector = generateSearchVector(
        validation.data.title || existing.title,
        validation.data.content,
        validation.data.tags || existing.tags
      );
    } else if (validation.data.title || validation.data.tags) {
      updateData.searchVector = generateSearchVector(
        validation.data.title || existing.title,
        existing.content,
        validation.data.tags || existing.tags
      );
    }

    const artifact = await prisma.artifact.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, title: true, version: true },
        },
        children: {
          select: { id: true, title: true, version: true },
        },
      },
    });

    res.json({
      success: true,
      data: artifact,
    });
  } catch (error) {
    console.error('Artifact update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update artifact',
    });
  }
});

/**
 * @swagger
 * /api/artifacts/{id}/version:
 *   post:
 *     summary: Create a new version of an artifact
 *     tags: [Artifacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: New version created successfully
 */
router.post('/artifacts/:id/version', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id: parentId } = req.params;

    // Get parent artifact
    const parent = await prisma.artifact.findFirst({
      where: { id: parentId },
      include: { workspace: true },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent artifact not found',
      });
    }

    if (parent.workspace.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this artifact',
      });
    }

    const { title, content, tags } = req.body;

    const finalTitle = title || parent.title;
    const finalContent = content || parent.content;
    const finalTags = tags || parent.tags;

    const contentHash = calculateContentHash(finalContent);
    const searchVector = generateSearchVector(finalTitle, finalContent, finalTags);
    const lineage = Array.isArray(parent.lineage)
      ? [...parent.lineage, parentId]
      : [parentId];

    const newVersion = await prisma.artifact.create({
      data: {
        workspaceId: parent.workspaceId,
        title: finalTitle,
        type: parent.type,
        content: finalContent,
        contentHash,
        tags: finalTags,
        status: 'DRAFT', // New versions start as draft
        version: parent.version + 1,
        parentId,
        lineage,
        searchVector,
        createdBy: userId,
        source: `version:${parentId}`,
      },
      include: {
        parent: {
          select: { id: true, title: true, version: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: newVersion,
      message: `Created version ${newVersion.version}`,
    });
  } catch (error) {
    console.error('Version creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create new version',
    });
  }
});

/**
 * @swagger
 * /api/artifacts/{id}:
 *   delete:
 *     summary: Delete artifact (soft delete to ARCHIVED status)
 *     tags: [Artifacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Artifact deleted successfully
 */
router.delete('/artifacts/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const artifact = await prisma.artifact.findFirst({
      where: { id },
      include: { workspace: true },
    });

    if (!artifact) {
      return res.status(404).json({
        success: false,
        error: 'Artifact not found',
      });
    }

    if (artifact.workspace.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this artifact',
      });
    }

    // Soft delete: archive instead of hard delete
    await prisma.artifact.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Artifact archived successfully',
    });
  } catch (error) {
    console.error('Artifact deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete artifact',
    });
  }
});

export default router;
