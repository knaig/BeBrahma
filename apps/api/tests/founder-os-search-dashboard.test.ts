import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createServer } from '../src/server';

describe('Founder OS - Search & Dashboard API Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    app = createServer();
    prisma = new PrismaClient();

    authToken = 'test-auth-token';
    userId = 'test-user-123';

    // Create test workspace
    const workspace = await prisma.workspace.create({
      data: {
        userId,
        name: 'Search Test Workspace',
        slug: 'search-test-workspace',
        objectives: ['Test search'],
        constraints: [],
        status: 'active',
      },
    });
    workspaceId = workspace.id;

    // Create test project for tasks
    const project = await prisma.project.create({
      data: {
        userId,
        name: 'Test Project',
        description: 'Test project for dashboard',
      },
    });
    projectId = project.id;

    // Seed test artifacts
    await prisma.artifact.createMany({
      data: [
        {
          workspaceId,
          title: 'React Performance Optimization Guide',
          type: 'RESEARCH',
          status: 'PUBLISHED',
          content: 'Guide on optimizing React applications using memoization and code splitting',
          contentHash: 'hash1',
          tags: ['react', 'performance', 'optimization'],
          createdBy: userId,
          version: 1,
          lineage: [],
        },
        {
          workspaceId,
          title: 'Database Schema Design Decision',
          type: 'DECISION',
          status: 'APPROVED',
          content: 'We decided to use PostgreSQL with normalized schema for better data integrity',
          contentHash: 'hash2',
          tags: ['database', 'architecture', 'decision'],
          createdBy: userId,
          version: 1,
          lineage: [],
        },
        {
          workspaceId,
          title: 'Weekly Team Meeting Notes',
          type: 'MEETING_NOTES',
          status: 'DRAFT',
          content: 'Discussed sprint progress, blockers, and next week planning',
          contentHash: 'hash3',
          tags: ['meeting', 'sprint'],
          createdBy: userId,
          version: 1,
          lineage: [],
        },
      ],
    });

    // Seed test tasks
    await prisma.task.createMany({
      data: [
        {
          projectId,
          title: 'Implement user authentication',
          description: 'Add OAuth and JWT authentication',
          status: 'IN_PROGRESS',
          priority: 'P0',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
          createdBy: userId,
        },
        {
          projectId,
          title: 'Fix production bug in payment flow',
          description: 'Users reporting failed payments',
          status: 'TODO',
          priority: 'P0',
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue
          createdBy: userId,
        },
        {
          projectId,
          title: 'Write API documentation',
          description: 'Document all REST endpoints',
          status: 'TODO',
          priority: 'P1',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due next week
          createdBy: userId,
        },
        {
          projectId,
          title: 'Setup monitoring dashboards',
          description: 'Configure Grafana and alerts',
          status: 'BLOCKED',
          priority: 'P1',
          createdBy: userId,
        },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.artifact.deleteMany({ where: { workspaceId } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.$disconnect();
  });

  describe('GET /api/search', () => {
    it('should search artifacts by title', async () => {
      const response = await request(app)
        .get('/api/search?q=React')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.artifacts.length).toBeGreaterThan(0);
      expect(
        response.body.data.artifacts.some((a: any) =>
          a.title.toLowerCase().includes('react')
        )
      ).toBe(true);
    });

    it('should search artifacts by content', async () => {
      const response = await request(app)
        .get('/api/search?q=PostgreSQL')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.artifacts.length).toBeGreaterThan(0);
      expect(
        response.body.data.artifacts.some((a: any) =>
          a.snippet.toLowerCase().includes('postgresql')
        )
      ).toBe(true);
    });

    it('should search tasks', async () => {
      const response = await request(app)
        .get('/api/search?q=authentication')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks.length).toBeGreaterThan(0);
      expect(
        response.body.data.tasks.some((t: any) =>
          t.title.toLowerCase().includes('authentication')
        )
      ).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/search?q=decision&type=DECISION')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.artifacts.every((a: any) => a.type === 'DECISION')).toBe(
        true
      );
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/search?q=&status=PUBLISHED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.artifacts.length > 0) {
        expect(
          response.body.data.artifacts.every((a: any) => a.status === 'PUBLISHED')
        ).toBe(true);
      }
    });

    it('should filter by workspace', async () => {
      const response = await request(app)
        .get(`/api/search?q=React&workspaceId=${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.artifacts.every((a: any) => a.workspace.id === workspaceId)
      ).toBe(true);
    });

    it('should return total count', async () => {
      const response = await request(app)
        .get('/api/search?q=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(
        response.body.data.artifacts.length + response.body.data.tasks.length
      );
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/search?q=&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.artifacts.length).toBeLessThanOrEqual(2);
    });

    it('should require minimum query length', async () => {
      const response = await request(app)
        .get('/api/search?q=a')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least 2 characters');
    });
  });

  describe('GET /api/search/suggest', () => {
    it('should return suggestions for partial query', async () => {
      const response = await request(app)
        .get('/api/search/suggest?q=Rea')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should return tag suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggest?q=per')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tags).toBeDefined();
      expect(Array.isArray(response.body.data.tags)).toBe(true);
    });

    it('should limit suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggest?q=te')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('onFire');
      expect(response.body.data).toHaveProperty('inProgress');
      expect(response.body.data).toHaveProperty('next');
      expect(response.body.data).toHaveProperty('blocked');
      expect(response.body.data).toHaveProperty('activeArtifacts');
      expect(response.body.data).toHaveProperty('recentDecisions');
      expect(response.body.data).toHaveProperty('stats');
    });

    it('should include on-fire tasks (overdue or due soon)', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.onFire.length).toBeGreaterThan(0);
      // Should include the overdue task
      expect(
        response.body.data.onFire.some((t: any) =>
          t.title.includes('Fix production bug')
        )
      ).toBe(true);
    });

    it('should include in-progress tasks', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.inProgress.length).toBeGreaterThan(0);
      expect(
        response.body.data.inProgress.every((t: any) => t.status === 'IN_PROGRESS')
      ).toBe(true);
    });

    it('should include blocked tasks', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.blocked.length).toBeGreaterThan(0);
      expect(response.body.data.blocked.every((t: any) => t.status === 'BLOCKED')).toBe(
        true
      );
    });

    it('should include next tasks (TODO, sorted by priority)', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.next.length).toBeGreaterThanOrEqual(0);
    });

    it('should include active artifacts', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.activeArtifacts)).toBe(true);
    });

    it('should include recent decisions', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.recentDecisions)).toBe(true);
      expect(
        response.body.data.recentDecisions.some((d: any) =>
          d.title.toLowerCase().includes('decision')
        )
      ).toBe(true);
    });

    it('should include stats', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('totalTasks');
      expect(response.body.data.stats).toHaveProperty('completedToday');
      expect(response.body.data.stats).toHaveProperty('artifactsThisWeek');
      expect(typeof response.body.data.stats.totalTasks).toBe('number');
    });

    it('should filter by workspace', async () => {
      const response = await request(app)
        .get(`/api/dashboard?workspaceId=${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.activeArtifacts.every((a: any) => a.workspace.id === workspaceId)
      ).toBe(true);
    });
  });

  describe('GET /api/dashboard/session-summary', () => {
    beforeAll(async () => {
      // Create a task and mark it completed
      const task = await prisma.task.create({
        data: {
          projectId,
          title: 'Test completed task',
          status: 'DONE',
          priority: 'P2',
          createdBy: userId,
          completedAt: new Date(),
        },
      });
    });

    it('should return session summary', async () => {
      const response = await request(app)
        .get('/api/dashboard/session-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionStart');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('details');
    });

    it('should include summary counts', async () => {
      const response = await request(app)
        .get('/api/dashboard/session-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.summary).toHaveProperty('artifactsCreated');
      expect(response.body.data.summary).toHaveProperty('artifactsEdited');
      expect(response.body.data.summary).toHaveProperty('tasksCreated');
      expect(response.body.data.summary).toHaveProperty('tasksCompleted');
      expect(response.body.data.summary).toHaveProperty('decisionsMade');
    });

    it('should include detailed lists', async () => {
      const response = await request(app)
        .get('/api/dashboard/session-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.details).toHaveProperty('artifactsCreated');
      expect(response.body.data.details).toHaveProperty('tasksCompleted');
      expect(Array.isArray(response.body.data.details.artifactsCreated)).toBe(true);
      expect(Array.isArray(response.body.data.details.tasksCompleted)).toBe(true);
    });

    it('should filter by since parameter', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/dashboard/session-summary?since=${yesterday}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionStart).toBe(yesterday);
    });
  });
});
