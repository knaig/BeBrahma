import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, createMockSession, updateMockSession, getMockSession, clearAllMockSessions } from '../setup';
import { NextRequest } from 'next/server';
import { POST as clarifyProblem } from '../../../app/api/ai/clarify-problem/route';
import { POST as scaAnalysis } from '../../../app/api/ai/sca-analysis/route';
import { POST as mvpPlanning } from '../../../app/api/ai/mvp-planning/route';
import { POST as exportActions } from '../../../app/api/workflow/task/export-actions/route';
import { GET as getTask, PATCH as updateTask } from '../../../app/api/workflow/task/[id]/route';
import { http, HttpResponse } from 'msw';

describe('Integration: Workflow Session Persistence', () => {
  beforeEach(() => {
    server.resetHandlers();
    clearAllMockSessions();
  });

  describe('Complete Workflow Session', () => {
    it('should maintain data flow through complete AI analysis to task execution workflow', async () => {
      const sessionId = 'complete-workflow-session';
      const projectId = 'proj-integration-test';
      const projectName = 'Integration Test Project';

      // Initialize session
      createMockSession(sessionId, {
        projectId,
        projectName,
        stage: 'initial',
        data: {}
      });

      // Mock backend responses to use session data
      server.use(
        http.post('*/api/ai/clarify-problem', async ({ request }) => {
          const body = await request.json() as any;
          const session = getMockSession(sessionId);
          
          const clarifiedData = {
            success: true,
            clarifiedProblem: `Clarified: ${body.problemStatement}`,
            originalProblem: body.problemStatement,
            targetAudience: 'Small businesses',
            painPoints: ['Inefficient processes', 'Poor collaboration'],
            projectId: body.projectId,
            projectName: body.projectName
          };

          updateMockSession(sessionId, {
            stage: 'problem-clarified',
            data: { ...session?.data, clarification: clarifiedData }
          });

          return HttpResponse.json(clarifiedData);
        }),

        http.post('*/api/ai/sca-analysis', async ({ request }) => {
          const body = await request.json() as any;
          const session = getMockSession(sessionId);

          const scaData = {
            success: true,
            scaFactors: [
              {
                id: 'sca-tech-1',
                category: 'TECHNICAL',
                factor: 'Development Capabilities',
                description: 'Strong technical foundation',
                strength: 'HIGH',
                sustainability: 'LONG_TERM',
                evidence: ['Team expertise', 'Technology stack'],
                actionItems: ['Continue development', 'Scale team']
              },
              {
                id: 'sca-biz-1',
                category: 'BUSINESS_MODEL',
                factor: 'Market Opportunity',
                description: 'Growing market demand',
                strength: 'MEDIUM',
                sustainability: 'MEDIUM_TERM',
                evidence: ['Market research', 'Customer feedback'],
                actionItems: ['Market validation', 'Customer acquisition']
              }
            ],
            projectId: body.projectId,
            projectName: body.projectName
          };

          updateMockSession(sessionId, {
            stage: 'sca-completed',
            data: { ...session?.data, sca: scaData }
          });

          return HttpResponse.json(scaData);
        }),

        http.post('*/api/ai/mvp-planning', async ({ request }) => {
          const body = await request.json() as any;
          const session = getMockSession(sessionId);

          const mvpData = {
            success: true,
            mvpFeatures: [
              {
                id: 'mvp-1',
                name: 'User Authentication',
                description: 'Secure login system',
                priority: 'MUST_HAVE',
                effort: 'MEDIUM',
                impact: 'HIGH',
                userStories: ['As a user, I want to login securely'],
                acceptanceCriteria: ['Secure authentication'],
                estimatedHours: 24,
                estimatedCost: 1200,
                scaAlignment: ['sca-tech-1']
              },
              {
                id: 'mvp-2',
                name: 'Dashboard',
                description: 'Main user interface',
                priority: 'MUST_HAVE',
                effort: 'HIGH',
                impact: 'HIGH',
                userStories: ['As a user, I want a dashboard'],
                acceptanceCriteria: ['Intuitive interface'],
                estimatedHours: 40,
                estimatedCost: 2000,
                scaAlignment: ['sca-tech-1', 'sca-biz-1']
              }
            ],
            projectId: body.projectId,
            projectName: body.projectName
          };

          updateMockSession(sessionId, {
            stage: 'mvp-planned',
            data: { ...session?.data, mvp: mvpData }
          });

          return HttpResponse.json(mvpData);
        }),

        http.post('*/api/workflow/task/export-actions', async ({ request }) => {
          const body = await request.json() as any;
          const session = getMockSession(sessionId);

          const exportResult = {
            results: body.actions.map((action: any, index: number) => ({
              status: 'success',
              id: `wp-${index + 1}`,
              href: `${body.openProjectConfig.baseUrl}/work_packages/${index + 1}`,
              title: action.title
            }))
          };

          updateMockSession(sessionId, {
            stage: 'tasks-exported',
            data: { ...session?.data, export: exportResult }
          });

          return HttpResponse.json(exportResult);
        }),

        http.get('*/api/workflow/task/:id', async ({ params }) => {
          const { id } = params;
          const session = getMockSession(sessionId);
          
          return HttpResponse.json({
            id,
            title: `Task from session ${sessionId}`,
            status: 'pending',
            sessionId,
            sessionData: session?.data
          });
        }),

        http.patch('*/api/workflow/task/:id', async ({ params, request }) => {
          const { id } = params;
          const updates = await request.json() as any;
          const session = getMockSession(sessionId);

          const updatedTask = {
            id,
            ...updates,
            updatedAt: new Date().toISOString(),
            sessionId
          };

          updateMockSession(sessionId, {
            data: { 
              ...session?.data, 
              tasks: { 
                ...session?.data?.tasks, 
                [id as string]: updatedTask 
              }
            }
          });

          return HttpResponse.json(updatedTask);
        })
      );

      // Step 1: Problem Clarification
      const problemClarificationRequest = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          problemStatement: 'Small businesses struggle with project management',
          projectId,
          projectName,
          context: 'B2B SaaS for small business project management'
        })
      });

      const clarifyResponse = await clarifyProblem(problemClarificationRequest);
      const clarifyData = await clarifyResponse.json();

      expect(clarifyResponse.status).toBe(200);
      expect(clarifyData.success).toBe(true);
      expect(clarifyData.targetAudience).toBe('Small businesses');

      // Verify session state
      let sessionData = getMockSession(sessionId);
      expect(sessionData?.stage).toBe('problem-clarified');
      expect(sessionData?.data.clarification).toBeDefined();

      // Step 2: SCA Analysis using clarified problem context
      const scaRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          projectId,
          projectName,
          context: `${clarifyData.clarifiedProblem} targeting ${clarifyData.targetAudience}`
        })
      });

      const scaResponse = await scaAnalysis(scaRequest);
      const scaData = await scaResponse.json();

      expect(scaResponse.status).toBe(200);
      expect(scaData.success).toBe(true);
      expect(scaData.scaFactors).toHaveLength(2);

      // Verify session state progression
      sessionData = getMockSession(sessionId);
      expect(sessionData?.stage).toBe('sca-completed');
      expect(sessionData?.data.sca).toBeDefined();

      // Step 3: MVP Planning using SCA factors
      const mvpRequest = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          projectId,
          projectName,
          scaFactors: scaData.scaFactors,
          context: `MVP planning for ${projectName} based on SCA analysis`
        })
      });

      const mvpResponse = await mvpPlanning(mvpRequest);
      const mvpData = await mvpResponse.json();

      expect(mvpResponse.status).toBe(200);
      expect(mvpData.success).toBe(true);
      expect(mvpData.mvpFeatures).toHaveLength(2);

      // Verify MVP features align with SCA factors
      const feature1 = mvpData.mvpFeatures[0];
      expect(feature1.scaAlignment).toContain('sca-tech-1');

      // Verify session state
      sessionData = getMockSession(sessionId);
      expect(sessionData?.stage).toBe('mvp-planned');
      expect(sessionData?.data.mvp).toBeDefined();

      // Step 4: Export actions to OpenProject
      const actionsToExport = mvpData.mvpFeatures.map((feature: any) => ({
        title: feature.name,
        description: feature.description,
        priority: feature.priority.toLowerCase(),
        estimate: `${feature.estimatedHours} hours`
      }));

      const exportRequest = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          openProjectConfig: {
            baseUrl: 'https://openproject.example.com',
            apiToken: 'test-token',
            projectId: '1'
          },
          actions: actionsToExport
        })
      });

      const exportResponse = await exportActions(exportRequest);
      const exportData = await exportResponse.json();

      expect(exportResponse.status).toBe(200);
      expect(exportData.results).toHaveLength(2);
      expect(exportData.results[0].status).toBe('success');

      // Verify session state
      sessionData = getMockSession(sessionId);
      expect(sessionData?.stage).toBe('tasks-exported');
      expect(sessionData?.data.export).toBeDefined();

      // Step 5: Update task status through PATCH operations
      const taskId = 'wp-1';
      
      const updateRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          status: 'in-progress',
          assignee: 'developer@example.com'
        })
      });

      const updateResponse = await updateTask(updateRequest, { params: { id: taskId } });
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.status).toBe('in-progress');
      expect(updateData.assignee).toBe('developer@example.com');
      expect(updateData.sessionId).toBe(sessionId);

      // Step 6: Verify complete workflow data consistency
      const finalSessionData = getMockSession(sessionId);
      expect(finalSessionData?.data.clarification).toBeDefined();
      expect(finalSessionData?.data.sca).toBeDefined();
      expect(finalSessionData?.data.mvp).toBeDefined();
      expect(finalSessionData?.data.export).toBeDefined();
      expect(finalSessionData?.data.tasks).toBeDefined();

      // Verify data relationships are maintained
      expect(finalSessionData?.data.clarification.projectId).toBe(projectId);
      expect(finalSessionData?.data.sca.projectId).toBe(projectId);
      expect(finalSessionData?.data.mvp.projectId).toBe(projectId);
      expect(finalSessionData?.data.tasks[taskId].sessionId).toBe(sessionId);
    });
  });

  describe('Session State Persistence', () => {
    it('should maintain session data across multiple API calls with same sessionId', async () => {
      const sessionId = 'persistence-test-session';
      const projectId = 'proj-persistence';

      // Create initial session
      createMockSession(sessionId, {
        projectId,
        stage: 'initial',
        data: { initialData: 'test' }
      });

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          const session = getMockSession(sessionId);
          const updatedData = {
            success: true,
            clarifiedProblem: 'Test problem',
            sessionData: session?.data
          };
          
          updateMockSession(sessionId, {
            stage: 'step1',
            data: { ...session?.data, step1: 'completed' }
          });

          return HttpResponse.json(updatedData);
        }),

        http.post('*/api/ai/sca-analysis', async () => {
          const session = getMockSession(sessionId);
          const updatedData = {
            success: true,
            scaFactors: [],
            sessionData: session?.data
          };
          
          updateMockSession(sessionId, {
            stage: 'step2',
            data: { ...session?.data, step2: 'completed' }
          });

          return HttpResponse.json(updatedData);
        })
      );

      // First API call
      const request1 = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          problemStatement: 'test',
          projectId,
          projectName: 'Test',
          context: 'test'
        })
      });

      const response1 = await clarifyProblem(request1);
      const data1 = await response1.json();

      expect(data1.sessionData.initialData).toBe('test');
      expect(getMockSession(sessionId)?.stage).toBe('step1');

      // Second API call - should see data from first call
      const request2 = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          projectId,
          projectName: 'Test',
          context: 'test'
        })
      });

      const response2 = await scaAnalysis(request2);
      const data2 = await response2.json();

      expect(data2.sessionData.initialData).toBe('test');
      expect(data2.sessionData.step1).toBe('completed');
      expect(getMockSession(sessionId)?.stage).toBe('step2');
      expect(getMockSession(sessionId)?.data.step1).toBe('completed');
      expect(getMockSession(sessionId)?.data.step2).toBe('completed');
    });

    it('should isolate sessions between different sessionIds', async () => {
      const session1Id = 'isolation-session-1';
      const session2Id = 'isolation-session-2';

      // Create two separate sessions
      createMockSession(session1Id, { data: { session: 'session1' } });
      createMockSession(session2Id, { data: { session: 'session2' } });

      server.use(
        http.post('*/api/ai/clarify-problem', async ({ request }) => {
          const sessionId = request.headers.get('X-Session-ID');
          const session = getMockSession(sessionId!);
          
          return HttpResponse.json({
            success: true,
            sessionId,
            sessionData: session?.data
          });
        })
      );

      // Request from session 1
      const request1 = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': session1Id
        },
        body: JSON.stringify({
          problemStatement: 'test1',
          projectId: 'proj1',
          projectName: 'Test1',
          context: 'test1'
        })
      });

      // Request from session 2
      const request2 = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': session2Id
        },
        body: JSON.stringify({
          problemStatement: 'test2',
          projectId: 'proj2',
          projectName: 'Test2',
          context: 'test2'
        })
      });

      const [response1, response2] = await Promise.all([
        clarifyProblem(request1),
        clarifyProblem(request2)
      ]);

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);

      // Verify session isolation
      expect(data1.sessionId).toBe(session1Id);
      expect(data2.sessionId).toBe(session2Id);
      expect(data1.sessionData.session).toBe('session1');
      expect(data2.sessionData.session).toBe('session2');
    });

    it('should handle session cleanup and expiration', async () => {
      const sessionId = 'cleanup-test-session';

      // Create session
      createMockSession(sessionId, {
        data: { test: 'data' },
        createdAt: new Date().toISOString()
      });

      // Verify session exists
      expect(getMockSession(sessionId)).toBeDefined();

      // Simulate session cleanup
      clearAllMockSessions();

      // Verify session is cleaned up
      expect(getMockSession(sessionId)).toBeUndefined();
    });
  });

  describe('Cross-Service Data Flow', () => {
    it('should pass data correctly between AI analysis and workflow tasks', async () => {
      const sessionId = 'cross-service-test';
      const projectId = 'proj-cross-service';

      let capturedScaFactors: any[] = [];
      let capturedMvpFeatures: any[] = [];

      server.use(
        http.post('*/api/ai/sca-analysis', async () => {
          const scaFactors = [
            {
              id: 'sca-cross-1',
              category: 'TECHNICAL',
              factor: 'API Development',
              strength: 'HIGH'
            }
          ];
          capturedScaFactors = scaFactors;

          return HttpResponse.json({
            success: true,
            scaFactors
          });
        }),

        http.post('*/api/ai/mvp-planning', async ({ request }) => {
          const body = await request.json() as any;
          
          // Verify SCA factors are passed correctly
          expect(body.scaFactors).toEqual(capturedScaFactors);

          const mvpFeatures = [
            {
              id: 'mvp-cross-1',
              name: 'API Endpoint',
              scaAlignment: ['sca-cross-1'],
              derivedFromSca: true
            }
          ];
          capturedMvpFeatures = mvpFeatures;

          return HttpResponse.json({
            success: true,
            mvpFeatures
          });
        }),

        http.post('*/api/workflow/task/export-actions', async ({ request }) => {
          const body = await request.json() as any;
          
          // Verify actions are derived from MVP features
          expect(body.actions[0].title).toBe('API Endpoint');

          return HttpResponse.json({
            results: [
              {
                status: 'success',
                id: 'wp-cross-1',
                derivedFromMvp: 'mvp-cross-1'
              }
            ]
          });
        })
      );

      // SCA Analysis
      const scaRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName: 'Cross Service Test',
          context: 'Testing data flow'
        })
      });

      const scaResponse = await scaAnalysis(scaRequest);
      const scaData = await scaResponse.json();

      // MVP Planning using SCA results
      const mvpRequest = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName: 'Cross Service Test',
          scaFactors: scaData.scaFactors,
          context: 'MVP based on SCA'
        })
      });

      const mvpResponse = await mvpPlanning(mvpRequest);
      const mvpData = await mvpResponse.json();

      // Export actions based on MVP features
      const exportRequest = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openProjectConfig: {
            baseUrl: 'https://test.com',
            apiToken: 'token',
            projectId: '1'
          },
          actions: mvpData.mvpFeatures.map((f: any) => ({
            title: f.name,
            description: f.description || 'Generated from MVP'
          }))
        })
      });

      const exportResponse = await exportActions(exportRequest);
      const exportData = await exportResponse.json();

      // Verify complete data flow
      expect(exportData.results[0].status).toBe('success');
      expect(exportData.results[0].derivedFromMvp).toBe('mvp-cross-1');
    });

    it('should preserve context across service boundaries', async () => {
      const sessionId = 'context-preservation-test';
      const originalContext = {
        industry: 'healthcare',
        targetMarket: 'small clinics',
        budget: 50000,
        timeline: '6 months'
      };

      server.use(
        http.post('*/api/ai/clarify-problem', async ({ request }) => {
          const body = await request.json() as any;
          
          return HttpResponse.json({
            success: true,
            clarifiedProblem: 'Healthcare management system',
            preservedContext: body.context,
            contextAnalysis: {
              industry: 'detected healthcare focus',
              marketSize: 'small business segment identified'
            }
          });
        }),

        http.post('*/api/ai/sca-analysis', async ({ request }) => {
          const body = await request.json() as any;
          
          // Verify context is preserved and can be analyzed
          expect(body.context).toContain('healthcare');
          expect(body.context).toContain('small clinics');

          return HttpResponse.json({
            success: true,
            scaFactors: [
              {
                id: 'sca-healthcare-1',
                category: 'REGULATORY',
                factor: 'HIPAA Compliance',
                contextSpecific: true,
                derivedFromContext: 'healthcare industry requirement'
              }
            ]
          });
        })
      );

      // Problem clarification with rich context
      const clarifyRequest = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement: 'Need better patient management',
          projectId: 'proj-healthcare',
          projectName: 'ClinicManager Pro',
          context: JSON.stringify(originalContext)
        })
      });

      const clarifyResponse = await clarifyProblem(clarifyRequest);
      const clarifyData = await clarifyResponse.json();

      // SCA analysis should receive and utilize the context
      const scaRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-healthcare',
          projectName: 'ClinicManager Pro',
          context: `${clarifyData.clarifiedProblem} - Industry: ${originalContext.industry}, Target: ${originalContext.targetMarket}`
        })
      });

      const scaResponse = await scaAnalysis(scaRequest);
      const scaData = await scaResponse.json();

      // Verify context-specific analysis
      expect(scaData.scaFactors[0].factor).toBe('HIPAA Compliance');
      expect(scaData.scaFactors[0].contextSpecific).toBe(true);
      expect(scaData.scaFactors[0].derivedFromContext).toContain('healthcare');
    });
  });

  describe('Error Recovery', () => {
    it('should handle workflow continuation after API failures', async () => {
      const sessionId = 'error-recovery-test';
      let requestCount = 0;

      server.use(
        http.post('*/api/ai/sca-analysis', async () => {
          requestCount++;
          if (requestCount === 1) {
            return new HttpResponse(null, { status: 500 });
          } else {
            return HttpResponse.json({
              success: true,
              scaFactors: [{ id: 'sca-retry-1', category: 'TECHNICAL' }]
            });
          }
        })
      );

      const request1 = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-recovery',
          projectName: 'Recovery Test',
          context: 'Testing error recovery'
        })
      });

      // First request should fail
      const response1 = await scaAnalysis(request1);
      expect(response1.status).toBe(500);

      // Second request should succeed
      const request2 = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-recovery',
          projectName: 'Recovery Test',
          context: 'Testing error recovery - retry'
        })
      });

      const response2 = await scaAnalysis(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.success).toBe(true);
    });

    it('should handle partial failure scenarios with graceful degradation', async () => {
      const sessionId = 'partial-failure-test';

      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          return HttpResponse.json({
            success: true,
            mvpFeatures: [
              { id: 'mvp-1', name: 'Feature 1' },
              { id: 'mvp-2', name: 'Feature 2' },
              { id: 'mvp-3', name: 'Feature 3' }
            ]
          });
        }),

        http.post('*/api/workflow/task/export-actions', async ({ request }) => {
          const body = await request.json() as any;
          
          return HttpResponse.json({
            results: body.actions.map((action: any, index: number) => ({
              status: index === 1 ? 'error' : 'success',
              id: index === 1 ? null : `wp-${index + 1}`,
              error: index === 1 ? 'Export failed for this action' : undefined,
              title: action.title
            }))
          });
        })
      );

      // Get MVP features
      const mvpRequest = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-partial-failure',
          projectName: 'Partial Failure Test',
          scaFactors: [],
          context: 'Testing partial failures'
        })
      });

      const mvpResponse = await mvpPlanning(mvpRequest);
      const mvpData = await mvpResponse.json();

      // Attempt to export all features
      const exportRequest = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openProjectConfig: {
            baseUrl: 'https://test.com',
            apiToken: 'token',
            projectId: '1'
          },
          actions: mvpData.mvpFeatures.map((f: any) => ({
            title: f.name,
            description: f.description || 'Feature description'
          }))
        })
      });

      const exportResponse = await exportActions(exportRequest);
      const exportData = await exportResponse.json();

      // Verify partial success handling
      expect(exportData.results).toHaveLength(3);
      expect(exportData.results[0].status).toBe('success');
      expect(exportData.results[1].status).toBe('error');
      expect(exportData.results[2].status).toBe('success');
      expect(exportData.results[1].error).toBeDefined();
    });
  });
});