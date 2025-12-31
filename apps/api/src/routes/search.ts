import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Full-text search across artifacts, decisions, and tasks
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by artifact type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: workspaceId
 *         schema:
 *           type: string
 *         description: Filter by workspace
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by created date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by created date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Max results per group
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const {
      q,
      type,
      status,
      workspaceId,
      dateFrom,
      dateTo,
      limit = '20',
    } = req.query;

    if (!q || (q as string).length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters',
      });
    }

    const searchLimit = Math.min(parseInt(limit as string, 10), 100);
    const searchQuery = (q as string).trim();

    // Get user's workspaces
    const userWorkspaces = await prisma.workspace.findMany({
      where: { userId },
      select: { id: true },
    });
    const workspaceIds = userWorkspaces.map((w) => w.id);

    if (workspaceIds.length === 0) {
      return res.json({
        success: true,
        data: {
          artifacts: [],
          tasks: [],
          total: 0,
          query: searchQuery,
        },
      });
    }

    // Build where clause
    const where: any = {
      workspaceId: workspaceId
        ? workspaceId
        : { in: workspaceIds },
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // For MVP, use simple ILIKE search (PostgreSQL)
    // TODO: Migrate to full-text search with tsvector for better performance
    const searchConditions = {
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { content: { contains: searchQuery, mode: 'insensitive' } },
        { tags: { hasSome: searchQuery.split(' ').filter((t) => t.length > 2) } },
      ],
    };

    const artifactWhere = { ...where, ...searchConditions };

    // Search artifacts
    const artifacts = await prisma.artifact.findMany({
      where: artifactWhere,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        version: true,
        content: true,
        tags: true,
        createdAt: true,
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
      take: searchLimit,
    });

    // Generate snippets (context around match)
    const artifactsWithSnippets = artifacts.map((artifact) => {
      const contentLower = artifact.content.toLowerCase();
      const queryLower = searchQuery.toLowerCase();
      const matchIndex = contentLower.indexOf(queryLower);

      let snippet = '';
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 75);
        const end = Math.min(artifact.content.length, matchIndex + searchQuery.length + 75);
        snippet = `${start > 0 ? '...' : ''}${artifact.content.slice(start, end)}${
          end < artifact.content.length ? '...' : ''
        }`;
      } else if (artifact.content.length > 150) {
        snippet = `${artifact.content.slice(0, 150)}...`;
      } else {
        snippet = artifact.content;
      }

      return {
        id: artifact.id,
        title: artifact.title,
        type: artifact.type,
        status: artifact.status,
        version: artifact.version,
        snippet,
        tags: artifact.tags,
        updatedAt: artifact.updatedAt,
        workspace: artifact.workspace,
        rank: matchIndex !== -1 ? 1 : 0.5, // Simple relevance score
      };
    });

    // Search tasks (if they have related artifact or description matches)
    const tasks = await prisma.task.findMany({
      where: {
        project: {
          userId,
        },
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: searchLimit,
    });

    const total = artifacts.length + tasks.length;

    res.json({
      success: true,
      data: {
        artifacts: artifactsWithSnippets,
        tasks,
        total,
        query: searchQuery,
        filters: {
          type,
          status,
          workspaceId,
          dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
        },
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * @swagger
 * /api/search/suggest:
 *   get:
 *     summary: Get search suggestions (autocomplete)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *     responses:
 *       200:
 *         description: Suggestions retrieved
 */
router.get('/search/suggest', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    const searchQuery = (q as string).trim();

    // Get user's workspaces
    const userWorkspaces = await prisma.workspace.findMany({
      where: { userId },
      select: { id: true },
    });
    const workspaceIds = userWorkspaces.map((w) => w.id);

    if (workspaceIds.length === 0) {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    // Get recent/popular titles matching query
    const suggestions = await prisma.artifact.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        title: { contains: searchQuery, mode: 'insensitive' },
      },
      select: {
        title: true,
        type: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      distinct: ['title'],
    });

    // Get popular tags matching query
    const allArtifacts = await prisma.artifact.findMany({
      where: {
        workspaceId: { in: workspaceIds },
      },
      select: {
        tags: true,
      },
    });

    const allTags = allArtifacts.flatMap((a) => a.tags);
    const matchingTags = Array.from(new Set(allTags))
      .filter((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3);

    res.json({
      success: true,
      data: {
        suggestions: suggestions.map((s) => ({
          text: s.title,
          type: 'artifact',
          category: s.type,
        })),
        tags: matchingTags.map((tag) => ({
          text: tag,
          type: 'tag',
        })),
      },
    });
  } catch (error) {
    console.error('Search suggestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
    });
  }
});

export default router;
