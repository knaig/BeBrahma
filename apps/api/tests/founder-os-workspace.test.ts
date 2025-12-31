import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createServer } from '../src/server';

describe('Founder OS - Workspace API Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    app = createServer();
    prisma = new PrismaClient();

    // Mock auth token for testing
    authToken = 'test-auth-token';
    userId = 'test-user-123';
  });

  afterAll(async () => {
    // Cleanup test data
    if (workspaceId) {
      await prisma.workspace.deleteMany({
        where: { userId },
      });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/workspaces', () => {
    it('should create a new workspace with valid data', async () => {
      const workspaceData = {
        name: 'Test Startup',
        slug: 'test-startup',
        description: 'A test workspace for unit tests',
        objectives: [
          'Launch MVP in 3 months',
          'Get 100 beta users',
          'Raise seed round',
        ],
        constraints: [
          'Budget: $50k',
          'Team: Solo founder',
          'Timeline: 6 months',
        ],
      };

      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: workspaceData.name,
        slug: workspaceData.slug,
        description: workspaceData.description,
        objectives: workspaceData.objectives,
        constraints: workspaceData.constraints,
        status: 'active',
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();

      workspaceId = response.body.data.id;
    });

    it('should reject workspace creation without name', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ slug: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should reject duplicate slug', async () => {
      const workspaceData = {
        name: 'Duplicate Test',
        slug: 'test-startup', // Same as first test
        objectives: ['Test'],
      };

      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workspaceData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject workspace creation without auth', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({ name: 'Test', slug: 'test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/workspaces', () => {
    it('should list user workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('slug');
    });

    it('should filter active workspaces', async () => {
      const response = await request(app)
        .get('/api/workspaces?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((w: any) => w.status === 'active')).toBe(true);
    });
  });

  describe('GET /api/workspaces/:slug', () => {
    it('should get workspace by slug', async () => {
      const response = await request(app)
        .get('/api/workspaces/test-startup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('test-startup');
      expect(response.body.data.objectives).toBeDefined();
      expect(response.body.data.constraints).toBeDefined();
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app)
        .get('/api/workspaces/non-existent-slug')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/workspaces/:slug', () => {
    it('should update workspace', async () => {
      const updateData = {
        description: 'Updated description',
        objectives: ['New objective 1', 'New objective 2'],
      };

      const response = await request(app)
        .put('/api/workspaces/test-startup')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.objectives).toEqual(updateData.objectives);
    });

    it('should not allow updating slug', async () => {
      const response = await request(app)
        .put('/api/workspaces/test-startup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ slug: 'new-slug' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/workspaces/:slug', () => {
    it('should archive workspace (soft delete)', async () => {
      const response = await request(app)
        .delete('/api/workspaces/test-startup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
    });

    it('should not show archived workspace in default list', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const archivedWorkspace = response.body.data.find(
        (w: any) => w.slug === 'test-startup'
      );
      expect(archivedWorkspace).toBeUndefined();
    });
  });
});
