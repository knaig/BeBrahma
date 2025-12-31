import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createServer } from '../src/server';

describe('Founder OS - Artifacts API Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let artifactId: string;

  beforeAll(async () => {
    app = createServer();
    prisma = new PrismaClient();

    authToken = 'test-auth-token';
    userId = 'test-user-123';

    // Create test workspace
    const workspace = await prisma.workspace.create({
      data: {
        userId,
        name: 'Test Workspace',
        slug: 'test-artifacts-workspace',
        objectives: ['Test'],
        constraints: [],
        status: 'active',
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.artifact.deleteMany({
      where: { workspaceId },
    });
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/artifacts', () => {
    it('should create a new artifact', async () => {
      const artifactData = {
        workspaceSlug: 'test-artifacts-workspace',
        title: 'Product Roadmap Q1 2024',
        type: 'PRD',
        status: 'DRAFT',
        content: '# Product Roadmap\n\n## Q1 Goals\n- Launch feature A\n- Beta test feature B',
        tags: ['roadmap', 'q1', 'planning'],
        source: 'conversation-abc123',
      };

      const response = await request(app)
        .post('/api/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(artifactData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: artifactData.title,
        type: artifactData.type,
        status: artifactData.status,
        content: artifactData.content,
        tags: artifactData.tags,
        source: artifactData.source,
        version: 1,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.contentHash).toBeDefined();
      expect(response.body.data.lineage).toEqual([]);

      artifactId = response.body.data.id;
    });

    it('should reject artifact without required fields', async () => {
      const response = await request(app)
        .post('/api/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should create artifact with all valid types', async () => {
      const types = [
        'PLAYBOOK',
        'PILOT_PACK',
        'PRD',
        'PITCH',
        'ONE_PAGER',
        'WORKFLOW',
        'DECISION',
        'MEETING_NOTES',
        'RESEARCH',
      ];

      for (const type of types) {
        const response = await request(app)
          .post('/api/artifacts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            workspaceSlug: 'test-artifacts-workspace',
            title: `Test ${type}`,
            type,
            content: `Content for ${type}`,
          })
          .expect(201);

        expect(response.body.data.type).toBe(type);
      }
    });
  });

  describe('GET /api/artifacts', () => {
    it('should list artifacts for workspace', async () => {
      const response = await request(app)
        .get(`/api/artifacts?workspaceSlug=test-artifacts-workspace`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get(`/api/artifacts?workspaceSlug=test-artifacts-workspace&type=PRD`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.type === 'PRD')).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/artifacts?workspaceSlug=test-artifacts-workspace&status=DRAFT`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.status === 'DRAFT')).toBe(true);
    });

    it('should filter by tags', async () => {
      const response = await request(app)
        .get(`/api/artifacts?workspaceSlug=test-artifacts-workspace&tags=roadmap,planning`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.some((a: any) =>
          a.tags.some((t: string) => ['roadmap', 'planning'].includes(t))
        )
      ).toBe(true);
    });
  });

  describe('GET /api/artifacts/:id', () => {
    it('should get artifact by ID', async () => {
      const response = await request(app)
        .get(`/api/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(artifactId);
      expect(response.body.data.title).toBe('Product Roadmap Q1 2024');
    });

    it('should include version lineage', async () => {
      const response = await request(app)
        .get(`/api/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.lineage).toBeDefined();
      expect(Array.isArray(response.body.data.lineage)).toBe(true);
    });

    it('should return 404 for non-existent artifact', async () => {
      const response = await request(app)
        .get('/api/artifacts/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/artifacts/:id', () => {
    it('should update artifact', async () => {
      const updateData = {
        title: 'Updated Product Roadmap Q1 2024',
        content: '# Updated Content\n\nNew information added',
        status: 'REVIEW',
        tags: ['roadmap', 'q1', 'planning', 'updated'],
      };

      const response = await request(app)
        .put(`/api/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.tags).toEqual(updateData.tags);
    });

    it('should update content hash when content changes', async () => {
      const getResponse = await request(app)
        .get(`/api/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const oldHash = getResponse.body.data.contentHash;

      const response = await request(app)
        .put(`/api/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Completely new content' })
        .expect(200);

      expect(response.body.data.contentHash).not.toBe(oldHash);
    });
  });

  describe('POST /api/artifacts/:id/version', () => {
    let versionId: string;

    it('should create a new version of artifact', async () => {
      const versionData = {
        title: 'Product Roadmap Q2 2024',
        content: '# Q2 Roadmap\n\nNew quarter, new goals',
      };

      const response = await request(app)
        .post(`/api/artifacts/${artifactId}/version`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(versionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(2);
      expect(response.body.data.parentId).toBe(artifactId);
      expect(response.body.data.lineage).toContain(artifactId);
      expect(response.body.data.title).toBe(versionData.title);
      expect(response.body.data.content).toBe(versionData.content);

      versionId = response.body.data.id;
    });

    it('should inherit type and workspace from parent', async () => {
      const response = await request(app)
        .post(`/api/artifacts/${artifactId}/version`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Version 3',
          content: 'V3 content',
        })
        .expect(201);

      expect(response.body.data.type).toBe('PRD');
      expect(response.body.data.workspaceId).toBe(workspaceId);
    });

    it('should track full lineage chain', async () => {
      const response = await request(app)
        .get(`/api/artifacts/${versionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.lineage).toEqual([artifactId]);
    });
  });

  describe('DELETE /api/artifacts/:id', () => {
    it('should archive artifact (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/artifacts/${artifactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ARCHIVED');
    });

    it('should not show archived artifacts in default list', async () => {
      const response = await request(app)
        .get(`/api/artifacts?workspaceSlug=test-artifacts-workspace`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const archivedArtifact = response.body.data.find((a: any) => a.id === artifactId);
      expect(archivedArtifact).toBeUndefined();
    });

    it('should show archived artifacts when includeArchived=true', async () => {
      const response = await request(app)
        .get(`/api/artifacts?workspaceSlug=test-artifacts-workspace&includeArchived=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const archivedArtifact = response.body.data.find((a: any) => a.id === artifactId);
      expect(archivedArtifact).toBeDefined();
      expect(archivedArtifact.status).toBe('ARCHIVED');
    });
  });

  describe('Content Hash and De-duplication', () => {
    it('should generate same hash for identical content', async () => {
      const content = '# Test Content\n\nThis is test content for hashing';

      const response1 = await request(app)
        .post('/api/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workspaceSlug: 'test-artifacts-workspace',
          title: 'Test Hash 1',
          type: 'RESEARCH',
          content,
        })
        .expect(201);

      const response2 = await request(app)
        .post('/api/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workspaceSlug: 'test-artifacts-workspace',
          title: 'Test Hash 2',
          type: 'RESEARCH',
          content,
        })
        .expect(201);

      expect(response1.body.data.contentHash).toBe(response2.body.data.contentHash);
    });

    it('should generate different hash for different content', async () => {
      const response1 = await request(app)
        .post('/api/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workspaceSlug: 'test-artifacts-workspace',
          title: 'Different Content 1',
          type: 'RESEARCH',
          content: 'Content A',
        })
        .expect(201);

      const response2 = await request(app)
        .post('/api/artifacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workspaceSlug: 'test-artifacts-workspace',
          title: 'Different Content 2',
          type: 'RESEARCH',
          content: 'Content B',
        })
        .expect(201);

      expect(response1.body.data.contentHash).not.toBe(response2.body.data.contentHash);
    });
  });
});
