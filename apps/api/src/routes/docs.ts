import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, withAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { documentationService } from '../services/documentationService.js';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BeBrahma Task Management API',
      version: '1.0.0',
      description: 'Comprehensive task management and project collaboration API with Kanban boards, dependency tracking, and export capabilities',
      contact: {
        name: 'BeBrahma Support',
        email: 'support@bebrahma.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.bebrahma.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            details: {
              type: 'string',
              example: 'Additional error details',
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            workflowStep: {
              type: 'string',
              enum: ['PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION', 'SOLUTION_BRAINSTORM', 'COMPETITOR_ANALYSIS', 'SCA_ANALYSIS', 'MVP_PLANNING', 'TASK_GENERATION'],
            },
            progress: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
            },
            selectedSolution: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Board: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            projectId: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            settings: {
              type: 'object',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            projectId: {
              type: 'string',
              format: 'uuid',
            },
            boardId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            category: {
              type: 'string',
            },
            priority: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
            },
            position: {
              type: 'integer',
            },
            estimatedHours: {
              type: 'integer',
              nullable: true,
            },
            assigneeId: {
              type: 'string',
              nullable: true,
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Projects',
        description: 'Project management operations',
      },
      {
        name: 'Tasks',
        description: 'Task and Kanban board operations',
      },
      {
        name: 'Export',
        description: 'Data export and documentation generation',
      },
      {
        name: 'Documentation',
        description: 'API documentation and guides',
      },
    ],
  },
  apis: [
    // Use absolute paths based on environment
    ...(process.env.NODE_ENV === 'production' 
      ? [
          path.resolve(__dirname, '../routes/*.js'), // Production: compiled JS files
        ]
      : [
          path.resolve(__dirname, '../routes/*.ts'), // Development: TypeScript files
          path.resolve(__dirname, '../routes/*.js'), // Fallback: compiled JS files
        ]
    ),
  ],
};

// Request validation schemas
const generateUserGuideSchema = z.object({
  format: z.enum(['pdf', 'html', 'markdown']).default('pdf'),
  includeScreenshots: z.boolean().default(true),
  includeWorkflow: z.boolean().default(true),
  includeTutorials: z.boolean().default(true),
  customSections: z.array(z.string()).optional(),
});

const generateDevResourcesSchema = z.object({
  format: z.enum(['pdf', 'html', 'markdown']).default('html'),
  includeApiExamples: z.boolean().default(true),
  includeWebhookDocs: z.boolean().default(true),
  includeSDKReference: z.boolean().default(false),
  apiVersion: z.string().default('v1'),
});

// GET /api/docs/swagger.json - Serve OpenAPI specification
/**
 * @swagger
 * /api/docs/swagger.json:
 *   get:
 *     summary: Get OpenAPI specification
 *     description: Returns the complete OpenAPI specification for the BeBrahma API
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/docs/swagger.json', (req, res) => {
  try {
    const swaggerSpec = swaggerJSDoc(swaggerOptions);
    
    // Add runtime information
    swaggerSpec.info.version = process.env.API_VERSION || '1.0.0';
    swaggerSpec.info['x-generated-at'] = new Date().toISOString();
    swaggerSpec.info['x-environment'] = process.env.NODE_ENV || 'development';

    // Add authentication info based on environment
    if (process.env.NODE_ENV === 'production') {
      swaggerSpec.servers = [
        {
          url: 'https://api.bebrahma.com',
          description: 'Production server',
        },
      ];
    }

    res.json(swaggerSpec);
  } catch (error) {
    console.error('Swagger JSON generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API documentation',
    });
  }
});

// GET /api/docs - Serve Swagger UI interface
/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Interactive API documentation
 *     description: Swagger UI interface for exploring and testing the API
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger UI interface
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(swaggerJSDoc(swaggerOptions), {
  customSiteTitle: 'BeBrahma API Documentation',
  customCss: `
    .topbar { display: none; }
    .swagger-ui .info .title { color: #2563eb; }
    .swagger-ui .scheme-container { background: #f8fafc; }
  `,
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    tryItOutEnabled: true,
  },
}));

// GET /api/docs/user-guide/:projectId - Auto-generated user guide
/**
 * @swagger
 * /api/docs/user-guide/{projectId}:
 *   get:
 *     summary: Generate user guide for project
 *     description: Creates a comprehensive user guide based on project structure and workflow
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, html, markdown]
 *           default: pdf
 *       - in: query
 *         name: includeScreenshots
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: includeWorkflow
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: User guide generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/html:
 *             schema:
 *               type: string
 *           text/markdown:
 *             schema:
 *               type: string
 *       404:
 *         description: Project not found
 */
router.get('/docs/user-guide/:projectId', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;

    // Verify project access
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        boards: {
          include: {
            tasks: {
              orderBy: [{ status: 'asc' }, { position: 'asc' }],
            },
          },
        },
        conversation: true,
        problems: true,
        solutions: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
      });
    }

    const config = generateUserGuideSchema.parse({
      format: req.query.format,
      includeScreenshots: req.query.includeScreenshots === 'true',
      includeWorkflow: req.query.includeWorkflow === 'true',
      includeTutorials: req.query.includeTutorials === 'true',
    });

    const userGuide = await documentationService.generateUserGuide(project, config);

    // Set appropriate headers
    const contentTypes = {
      pdf: 'application/pdf',
      html: 'text/html',
      markdown: 'text/markdown',
    };

    res.setHeader('Content-Type', contentTypes[config.format]);
    
    if (config.format === 'pdf') {
      res.setHeader('Content-Disposition', `inline; filename="user-guide-${project.name}.pdf"`);
    }

    res.send(userGuide.content);
  } catch (error) {
    console.error('User guide generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate user guide',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/docs/developer-resources - Technical documentation
/**
 * @swagger
 * /api/docs/developer-resources:
 *   get:
 *     summary: Get developer resources
 *     description: Returns technical documentation, API examples, and integration guides
 *     tags: [Documentation]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, html, markdown]
 *           default: html
 *       - in: query
 *         name: includeApiExamples
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: includeWebhookDocs
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Developer resources retrieved successfully
 */
router.get('/docs/developer-resources', async (req, res) => {
  try {
    const config = generateDevResourcesSchema.parse({
      format: req.query.format,
      includeApiExamples: req.query.includeApiExamples === 'true',
      includeWebhookDocs: req.query.includeWebhookDocs === 'true',
      includeSDKReference: req.query.includeSDKReference === 'true',
      apiVersion: req.query.apiVersion as string,
    });

    const devResources = await documentationService.generateDeveloperResources(config);

    // Set appropriate headers
    const contentTypes = {
      pdf: 'application/pdf',
      html: 'text/html',
      markdown: 'text/markdown',
    };

    res.setHeader('Content-Type', contentTypes[config.format]);
    
    if (config.format === 'pdf') {
      res.setHeader('Content-Disposition', 'inline; filename="developer-resources.pdf"');
    }

    res.send(devResources.content);
  } catch (error) {
    console.error('Developer resources generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate developer resources',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/docs/generate - On-demand documentation generation
/**
 * @swagger
 * /api/docs/generate:
 *   post:
 *     summary: Generate custom documentation
 *     description: Creates custom documentation with user-specified templates and content
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - format
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [user_guide, api_reference, workflow_docs, integration_guide]
 *               format:
 *                 type: string
 *                 enum: [pdf, html, markdown]
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               template:
 *                 type: string
 *               sections:
 *                 type: array
 *                 items:
 *                   type: string
 *               customContent:
 *                 type: object
 *     responses:
 *       200:
 *         description: Documentation generated successfully
 *       400:
 *         description: Invalid generation parameters
 */
router.post('/docs/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { type, format, projectId, template, sections, customContent } = req.body;

    if (!type || !format) {
      return res.status(400).json({
        success: false,
        error: 'Documentation type and format are required',
      });
    }

    // Validate project access if projectId provided
    let project = null;
    if (projectId) {
      project = await prisma.project.findFirst({
        where: { id: projectId, userId },
        include: {
          boards: {
            include: {
              tasks: true,
            },
          },
          conversation: true,
          problems: true,
          solutions: true,
          competitors: true,
          scaFactors: true,
          mvpFeatures: true,
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied',
        });
      }
    }

    const config = {
      type,
      format,
      template,
      sections,
      customContent,
      project,
    };

    const documentation = await documentationService.generateCustomDocumentation(config, userId);

    // Set appropriate headers
    const contentTypes = {
      pdf: 'application/pdf',
      html: 'text/html',
      markdown: 'text/markdown',
    };

    res.setHeader('Content-Type', contentTypes[format]);
    
    if (format === 'pdf') {
      const filename = `${type}-${Date.now()}.pdf`;
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    res.send(documentation.content);
  } catch (error) {
    console.error('Custom documentation generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate documentation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/docs/templates - List available documentation templates
/**
 * @swagger
 * /api/docs/templates:
 *   get:
 *     summary: Get documentation templates
 *     description: Lists all available documentation templates with their configurations
 *     tags: [Documentation]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user_guide, api_reference, workflow_docs, integration_guide]
 *         description: Filter templates by type
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, html, markdown]
 *         description: Filter templates by format
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/docs/templates', async (req, res) => {
  try {
    const type = req.query.type as string;
    const format = req.query.format as string;

    const templates = await documentationService.getDocumentationTemplates({ type, format });

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Documentation templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation templates',
    });
  }
});

// GET /api/docs/changelog - API changelog and version history
/**
 * @swagger
 * /api/docs/changelog:
 *   get:
 *     summary: Get API changelog
 *     description: Returns the API changelog with version history and breaking changes
 *     tags: [Documentation]
 *     parameters:
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *         description: Filter by specific version
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limit number of changelog entries
 *     responses:
 *       200:
 *         description: Changelog retrieved successfully
 */
router.get('/docs/changelog', async (req, res) => {
  try {
    const version = req.query.version as string;
    const limit = parseInt(req.query.limit as string) || 50;

    const changelog = await documentationService.getChangelog({ version, limit });

    res.json({
      success: true,
      changelog,
    });
  } catch (error) {
    console.error('Changelog error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch changelog',
    });
  }
});

// GET /api/docs/health - Documentation service health check
router.get('/docs/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        swagger: 'operational',
        documentGeneration: 'operational',
        templateEngine: 'operational',
      },
    };

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    console.error('Documentation health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Documentation service health check failed',
    });
  }
});

// GET /api/docs/stats - Documentation usage statistics
router.get('/docs/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    
    const stats = await documentationService.getDocumentationStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Documentation stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation statistics',
    });
  }
});

export default router;