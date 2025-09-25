import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment } from './utils/test-helpers';

test.describe('Backend API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestEnvironment(page);
  });

  test.describe('API Endpoint Integration', () => {
    test('should integrate with /chat/crew/start endpoint for workflow session initialization', async ({ page }) => {
      let startRequestBody: any = null;

      await page.route('**/chat/crew/start', async route => {
        startRequestBody = await route.request().postDataJSON();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'integration-session-001',
            messages: [{
              id: 'start-msg-1',
              content: 'Workflow initialized successfully through API integration.',
              sender: 'system',
              timestamp: Date.now(),
              apiEndpoint: '/chat/crew/start'
            }],
            status: 'active',
            currentStage: 'PROBLEM_CAPTURE',
            workflowMetadata: {
              initializedAt: Date.now(),
              apiVersion: 'v1',
              integrationMode: 'backend_orchestrated'
            }
          })
        });
      });

      await page.goto('/chat');
      await page.fill('[data-testid="task-input"]', 'Build enterprise API integration');
      await page.click('[data-testid="start-workflow-btn"]');

      // Verify API call was made with correct payload
      expect(startRequestBody).toBeTruthy();
      expect(startRequestBody.task).toBe('Build enterprise API integration');
      expect(startRequestBody.sessionId).toBeDefined();

      // Verify response handling
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Workflow initialized successfully through API integration');
      await expect(page.locator('[data-testid="session-id"]')).toContainText('integration-session-001');
      await expect(page.locator('[data-testid="api-integration-indicator"]')).toBeVisible();
    });

    test('should integrate with /chat/crew/next endpoint for step-by-step message progression', async ({ page }) => {
      const messageRequests: any[] = [];

      await page.route('**/chat/crew/next', async route => {
        const requestData = await route.request().postDataJSON();
        messageRequests.push({
          timestamp: Date.now(),
          sessionId: requestData.sessionId,
          messageCount: requestData.messageCount || 0
        });

        const responseMessage = {
          id: `next-msg-${messageRequests.length}`,
          content: `API Response ${messageRequests.length}: Processing your request through backend orchestration.`,
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'business-analyst',
            agentName: 'API Agent',
            agentTitle: 'Backend Integration Specialist',
            apiResponseId: messageRequests.length
          }
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: requestData.sessionId,
            messages: [responseMessage],
            status: 'active',
            apiEndpoint: '/chat/crew/next',
            requestSequence: messageRequests.length
          })
        });
      });

      await page.goto('/chat?sessionId=integration-session-001');

      // Test multiple API calls
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="next-message-button"]');
        
        // Verify API call sequence
        expect(messageRequests[i]).toBeTruthy();
        expect(messageRequests[i].sessionId).toBe('integration-session-001');
        
        // Verify UI updates
        await expect(page.locator('[data-testid="agent-message"]').last()).toContainText(`API Response ${i + 1}`);
        await expect(page.locator('[data-testid="api-response-indicator"]').last()).toBeVisible();
      }

      expect(messageRequests).toHaveLength(3);
    });

    test('should integrate with /chat/crew/decision endpoint for user decision processing', async ({ page }) => {
      let decisionRequestData: any = null;

      await page.route('**/chat/crew/decision', async route => {
        decisionRequestData = await route.request().postDataJSON();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: decisionRequestData.sessionId,
            messages: [{
              id: 'decision-response-1',
              content: `Decision "${decisionRequestData.decision}" processed successfully by backend API.`,
              sender: 'system',
              timestamp: Date.now(),
              decisionMetadata: {
                processedDecision: decisionRequestData.decision,
                processingTime: Date.now(),
                apiEndpoint: '/chat/crew/decision'
              }
            }],
            status: 'active',
            currentStage: decisionRequestData.decision === 'approve' ? 'PROBLEM_CLARIFICATION' : 'PROBLEM_CAPTURE',
            decisionResult: {
              accepted: true,
              nextAction: 'stage_progression'
            }
          })
        });
      });

      // Set up decision point
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'decision-integration-session',
            messages: [{
              id: 'decision-prompt',
              content: 'Ready for decision. Please choose how to proceed.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'awaiting_decision',
            pendingDecision: true
          })
        });
      });

      await page.goto('/chat?sessionId=decision-integration-session');
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="decision-approve"]');

      // Verify decision API integration
      expect(decisionRequestData).toBeTruthy();
      expect(decisionRequestData.sessionId).toBe('decision-integration-session');
      expect(decisionRequestData.decision).toBe('approve');

      // Verify response processing
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Decision "approve" processed successfully by backend API');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Clarification');
    });

    test('should integrate with /chat/crew/status/:sessionId endpoint for session state retrieval', async ({ page }) => {
      const sessionId = 'status-integration-session';
      let statusRequestCount = 0;

      await page.route(`**/chat/crew/status/${sessionId}`, async route => {
        statusRequestCount++;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: sessionId,
            messages: [{
              id: 'status-msg-1',
              content: `Status retrieved via API integration (request #${statusRequestCount}).`,
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: 'SOLUTION_DESIGN',
            progress: 45,
            apiMetadata: {
              endpoint: `/chat/crew/status/${sessionId}`,
              retrievalCount: statusRequestCount,
              lastAccessed: Date.now()
            }
          })
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, sessionId);

      await page.goto('/chat');

      // Verify status API call
      expect(statusRequestCount).toBeGreaterThan(0);
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Status retrieved via API integration');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Solution Design');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '45');

      // Test page reload triggers another status call
      await page.reload();
      expect(statusRequestCount).toBe(2);
    });

    test('should integrate with /chat/progress/:sessionId endpoint for real-time progress updates', async ({ page }) => {
      const progressSessionId = 'progress-integration-session';
      let progressRequestCount = 0;

      await page.route(`**/chat/progress/${progressSessionId}`, async route => {
        progressRequestCount++;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId: progressSessionId,
              currentStage: 'IMPLEMENTATION_PLAN',
              progress: Math.min(progressRequestCount * 15, 100),
              agentStatus: {
                'business-analyst': { 
                  status: 'completed',
                  lastActivity: Date.now() - 300000
                },
                'solution-architect': { 
                  status: 'active',
                  lastActivity: Date.now(),
                  currentTask: `API Integration Task ${progressRequestCount}`
                }
              },
              apiMetadata: {
                endpoint: `/chat/progress/${progressSessionId}`,
                pollCount: progressRequestCount,
                pollingInterval: 2000
              }
            }
          })
        });
      });

      await page.goto(`/chat?sessionId=${progressSessionId}`);

      // Wait for multiple progress polling requests
      await page.waitForTimeout(5000);

      // Verify progress API integration
      expect(progressRequestCount).toBeGreaterThanOrEqual(2);
      await expect(page.locator('[data-testid="agent-status-solution-architect"]')).toHaveAttribute('data-status', 'active');
      await expect(page.locator('[data-testid="agent-task-solution-architect"]')).toContainText('API Integration Task');
    });
  });

  test.describe('Request/Response Validation', () => {
    test('should validate API request payload formatting and required fields', async ({ page }) => {
      const requestValidations: any[] = [];

      await page.route('**/chat/crew/start', async route => {
        const requestBody = await route.request().postDataJSON();
        
        // Validate required fields
        const validation = {
          hasTask: !!requestBody.task,
          hasSessionId: !!requestBody.sessionId,
          hasContext: requestBody.context !== undefined,
          payloadStructure: Object.keys(requestBody).sort()
        };
        
        requestValidations.push(validation);

        if (!validation.hasTask) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Missing required field: task',
              code: 'VALIDATION_ERROR'
            })
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'validation-session',
            messages: [{ id: 'validation-success', content: 'Request validated successfully', sender: 'system', timestamp: Date.now() }],
            status: 'active'
          })
        });
      });

      await page.goto('/chat');
      
      // Test with valid request
      await page.fill('[data-testid="task-input"]', 'Valid task description');
      await page.click('[data-testid="start-workflow-btn"]');

      // Verify validation
      expect(requestValidations[0]).toBeTruthy();
      expect(requestValidations[0].hasTask).toBe(true);
      expect(requestValidations[0].hasSessionId).toBe(true);
      expect(requestValidations[0].payloadStructure).toContain('task');

      // Verify success response
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Request validated successfully');
    });

    test('should handle API response structure matching expected TypeScript interfaces', async ({ page }) => {
      interface ExpectedWorkflowResponse {
        sessionId: string;
        messages: Array<{
          id: string;
          content: string;
          sender: string;
          timestamp: number;
          agentMetadata?: {
            agentId: string;
            agentName: string;
            agentTitle: string;
          };
        }>;
        status: string;
        currentStage?: string;
        progress?: number;
      }

      let responseValidation: any = null;

      await page.route('**/chat/crew/next', async route => {
        const expectedResponse: ExpectedWorkflowResponse = {
          sessionId: 'interface-validation-session',
          messages: [{
            id: 'interface-msg-1',
            content: 'Response matching TypeScript interface.',
            sender: 'agent',
            timestamp: Date.now(),
            agentMetadata: {
              agentId: 'business-analyst',
              agentName: 'Interface Validator',
              agentTitle: 'API Response Analyst'
            }
          }],
          status: 'active',
          currentStage: 'PROBLEM_CAPTURE',
          progress: 25
        };

        // Validate response structure
        responseValidation = {
          hasSessionId: typeof expectedResponse.sessionId === 'string',
          hasMessages: Array.isArray(expectedResponse.messages),
          messageStructureValid: expectedResponse.messages.every(msg => 
            typeof msg.id === 'string' && 
            typeof msg.content === 'string' && 
            typeof msg.sender === 'string' && 
            typeof msg.timestamp === 'number'
          ),
          hasAgentMetadata: expectedResponse.messages[0].agentMetadata !== undefined,
          agentMetadataValid: expectedResponse.messages[0].agentMetadata && 
            typeof expectedResponse.messages[0].agentMetadata.agentId === 'string'
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(expectedResponse)
        });
      });

      await page.goto('/chat?sessionId=interface-validation-session');
      await page.click('[data-testid="next-message-button"]');

      // Verify interface compliance
      expect(responseValidation).toBeTruthy();
      expect(responseValidation.hasSessionId).toBe(true);
      expect(responseValidation.hasMessages).toBe(true);
      expect(responseValidation.messageStructureValid).toBe(true);
      expect(responseValidation.hasAgentMetadata).toBe(true);
      expect(responseValidation.agentMetadataValid).toBe(true);

      // Verify UI correctly handles structured response
      await expect(page.locator('[data-testid="agent-message"]')).toContainText('Response matching TypeScript interface');
      await expect(page.locator('[data-testid="agent-name"]')).toContainText('Interface Validator');
    });

    test('should handle API error responses and status code interpretation', async ({ page }) => {
      const errorScenarios = [
        { status: 400, error: 'Bad Request', code: 'INVALID_INPUT' },
        { status: 404, error: 'Session Not Found', code: 'SESSION_NOT_FOUND' },
        { status: 500, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
        { status: 503, error: 'Service Unavailable', code: 'SERVICE_DOWN' }
      ];

      for (const scenario of errorScenarios) {
        await page.route('**/chat/crew/next', async route => {
          await route.fulfill({
            status: scenario.status,
            contentType: 'application/json',
            body: JSON.stringify({
              error: scenario.error,
              code: scenario.code,
              timestamp: Date.now(),
              requestId: `error-${scenario.status}`
            })
          });
        });

        await page.goto(`/chat?sessionId=error-test-${scenario.status}`);
        await page.click('[data-testid="next-message-button"]');

        // Verify error handling
        await expect(page.locator('[data-testid="error-message"]')).toContainText(scenario.error);
        await expect(page.locator('[data-testid="error-code"]')).toContainText(scenario.code);
        
        if (scenario.status >= 500) {
          await expect(page.locator('[data-testid="retry-btn"]')).toBeVisible();
        }
        
        if (scenario.status === 404) {
          await expect(page.locator('[data-testid="session-not-found-indicator"]')).toBeVisible();
        }
      }
    });

    test('should handle API timeout scenarios and retry mechanisms', async ({ page }) => {
      let timeoutRequestCount = 0;
      const maxRetries = 3;

      await page.route('**/chat/crew/next', async route => {
        timeoutRequestCount++;
        
        if (timeoutRequestCount <= 2) {
          // First two requests timeout
          await new Promise(resolve => setTimeout(resolve, 5000));
          await route.fulfill({
            status: 408,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Request Timeout',
              code: 'TIMEOUT_ERROR',
              retryAfter: 2000
            })
          });
        } else {
          // Third request succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'timeout-recovery-session',
              messages: [{
                id: 'timeout-recovery-msg',
                content: 'Request succeeded after timeout recovery.',
                sender: 'system',
                timestamp: Date.now()
              }],
              status: 'active',
              recoveredFromTimeout: true,
              attemptCount: timeoutRequestCount
            })
          });
        }
      });

      await page.goto('/chat?sessionId=timeout-recovery-session');
      await page.click('[data-testid="next-message-button"]');

      // Should show timeout indicator initially
      await expect(page.locator('[data-testid="request-timeout-indicator"]')).toBeVisible();
      
      // Wait for automatic retries
      await page.waitForTimeout(8000);

      // Should eventually succeed
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Request succeeded after timeout recovery');
      expect(timeoutRequestCount).toBe(3);
    });
  });

  test.describe('Multi-Agent API Coordination', () => {
    test('should coordinate agent message generation through backend API calls', async ({ page }) => {
      const agentSequence = ['business-analyst', 'solution-architect', 'smart-planner'];
      let currentAgentIndex = 0;

      await page.route('**/chat/crew/next', async route => {
        const currentAgent = agentSequence[currentAgentIndex % agentSequence.length];
        currentAgentIndex++;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'multi-agent-coordination',
            messages: [{
              id: `agent-coord-${currentAgentIndex}`,
              content: `Multi-agent coordination: ${currentAgent} contributing to the analysis.`,
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: currentAgent,
                agentName: `${currentAgent} Agent`,
                agentTitle: `API-Coordinated ${currentAgent}`,
                coordinationSequence: currentAgentIndex
              }
            }],
            status: 'active',
            agentCoordination: {
              currentAgent: currentAgent,
              sequenceNumber: currentAgentIndex,
              nextAgent: agentSequence[(currentAgentIndex) % agentSequence.length]
            }
          })
        });
      });

      await page.goto('/chat?sessionId=multi-agent-coordination');

      // Test agent sequence coordination
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="next-message-button"]');
        
        const expectedAgent = agentSequence[i];
        await expect(page.locator('[data-testid="agent-message"]').last()).toContainText(`${expectedAgent} contributing`);
        await expect(page.locator('[data-testid="agent-coordination-indicator"]').last()).toContainText(`sequence ${i + 1}`);
      }
    });

    test('should transmit and display agent metadata through API responses', async ({ page }) => {
      const agentMetadataTest = {
        agentId: 'metadata-test-agent',
        agentName: 'Metadata Validation Agent',
        agentTitle: 'Senior API Integration Specialist',
        agentDepartment: 'Technical',
        expertise: ['API Design', 'Data Validation', 'Backend Integration'],
        experienceLevel: 'senior',
        communicationStyle: 'detailed_technical'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'metadata-validation-session',
            messages: [{
              id: 'metadata-msg-1',
              content: 'Testing comprehensive agent metadata transmission through API.',
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: agentMetadataTest
            }],
            status: 'active',
            metadataValidation: {
              fieldsTransmitted: Object.keys(agentMetadataTest).length,
              validationPassed: true
            }
          })
        });
      });

      await page.goto('/chat?sessionId=metadata-validation-session');
      await page.click('[data-testid="next-message-button"]');

      // Verify agent metadata display
      await expect(page.locator('[data-testid="agent-name"]')).toContainText('Metadata Validation Agent');
      await expect(page.locator('[data-testid="agent-title"]')).toContainText('Senior API Integration Specialist');
      await expect(page.locator('[data-testid="agent-department"]')).toContainText('Technical');
      
      // Verify expertise areas
      await expect(page.locator('[data-testid="agent-expertise"]')).toContainText('API Design');
      await expect(page.locator('[data-testid="agent-expertise"]')).toContainText('Data Validation');
      
      // Verify experience indicators
      await expect(page.locator('[data-testid="experience-level"]')).toHaveAttribute('data-level', 'senior');
      await expect(page.locator('[data-testid="communication-style"]')).toHaveAttribute('data-style', 'detailed_technical');
    });

    test('should validate agent role assignment and expertise area integration', async ({ page }) => {
      const roleAssignmentTests = [
        {
          stage: 'PROBLEM_CAPTURE',
          expectedAgents: ['business-analyst', 'smart-planner'],
          specialization: 'requirements_gathering'
        },
        {
          stage: 'SOLUTION_DESIGN', 
          expectedAgents: ['solution-architect', 'developer'],
          specialization: 'technical_design'
        },
        {
          stage: 'TESTING_STRATEGY',
          expectedAgents: ['qa-tester', 'developer'],
          specialization: 'quality_assurance'
        }
      ];

      for (const roleTest of roleAssignmentTests) {
        await page.route('**/chat/crew/next', async route => {
          const assignedAgent = roleTest.expectedAgents[0]; // Use first expected agent
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: `role-assignment-${roleTest.stage}`,
              messages: [{
                id: `role-msg-${roleTest.stage}`,
                content: `As the ${assignedAgent}, I'm perfectly suited for the ${roleTest.stage} stage.`,
                sender: 'agent',
                timestamp: Date.now(),
                agentMetadata: {
                  agentId: assignedAgent,
                  agentName: `${assignedAgent} Specialist`,
                  stageAlignment: roleTest.stage,
                  specialization: roleTest.specialization
                }
              }],
              status: 'active',
              currentStage: roleTest.stage,
              roleValidation: {
                agentSuitableForStage: true,
                expertiseMatch: true,
                expectedAgents: roleTest.expectedAgents
              }
            })
          });
        });

        await page.goto(`/chat?sessionId=role-assignment-${roleTest.stage}`);
        await page.click('[data-testid="next-message-button"]');

        // Verify role assignment
        await expect(page.locator('[data-testid="current-stage"]')).toContainText(roleTest.stage.replace('_', ' '));
        await expect(page.locator('[data-testid="agent-message"]')).toContainText(`perfectly suited for the ${roleTest.stage}`);
        await expect(page.locator('[data-testid="specialization-indicator"]')).toHaveAttribute('data-specialization', roleTest.specialization);
      }
    });

    test('should handle agent collaboration patterns through API coordination', async ({ page }) => {
      const collaborationScenario = {
        sessionId: 'collaboration-test-session',
        collaborationRound: 1
      };

      await page.route('**/chat/crew/next', async route => {
        const responses = [
          {
            agentId: 'business-analyst',
            content: 'I\'ve identified the core business requirements for this e-commerce platform.',
            collaborationType: 'initial_analysis'
          },
          {
            agentId: 'solution-architect', 
            content: 'Building on the business analyst\'s findings, I recommend a microservices architecture.',
            collaborationType: 'building_on_previous',
            references: ['business-analyst']
          },
          {
            agentId: 'smart-planner',
            content: 'Considering both the business requirements and technical architecture, here\'s our implementation roadmap.',
            collaborationType: 'synthesis',
            references: ['business-analyst', 'solution-architect']
          }
        ];

        const currentResponse = responses[collaborationScenario.collaborationRound - 1];
        collaborationScenario.collaborationRound++;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: collaborationScenario.sessionId,
            messages: [{
              id: `collab-msg-${collaborationScenario.collaborationRound - 1}`,
              content: currentResponse.content,
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: currentResponse.agentId,
                agentName: `${currentResponse.agentId} Agent`
              },
              collaborationMetadata: {
                type: currentResponse.collaborationType,
                references: currentResponse.references || [],
                buildOnPrevious: currentResponse.collaborationType === 'building_on_previous'
              }
            }],
            status: 'active',
            collaborationRound: collaborationScenario.collaborationRound - 1
          })
        });
      });

      await page.goto(`/chat?sessionId=${collaborationScenario.sessionId}`);

      // Test collaborative sequence
      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="agent-message"]').last()).toContainText('core business requirements');
      await expect(page.locator('[data-testid="collaboration-type"]').last()).toHaveAttribute('data-type', 'initial_analysis');

      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="agent-message"]').last()).toContainText('Building on the business analyst\'s findings');
      await expect(page.locator('[data-testid="collaboration-reference"]').last()).toContainText('business-analyst');

      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="agent-message"]').last()).toContainText('Considering both the business requirements and technical architecture');
      await expect(page.locator('[data-testid="collaboration-synthesis"]').last()).toBeVisible();
    });
  });

  test.describe('Workflow State Management', () => {
    test('should manage workflow stage progression through API state updates', async ({ page }) => {
      const stageProgression = [
        'PROBLEM_CAPTURE',
        'PROBLEM_CLARIFICATION', 
        'SOLUTION_DESIGN',
        'IMPLEMENTATION_PLAN'
      ];

      let currentStageIndex = 0;

      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        
        if (requestBody.decision === 'approve') {
          currentStageIndex = Math.min(currentStageIndex + 1, stageProgression.length - 1);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: requestBody.sessionId,
            messages: [{
              id: `stage-progression-${currentStageIndex}`,
              content: `Stage progression: Moving to ${stageProgression[currentStageIndex].replace('_', ' ')}`,
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: stageProgression[currentStageIndex],
            stageProgression: {
              previous: currentStageIndex > 0 ? stageProgression[currentStageIndex - 1] : null,
              current: stageProgression[currentStageIndex],
              next: currentStageIndex < stageProgression.length - 1 ? stageProgression[currentStageIndex + 1] : null,
              progressPercentage: Math.round(((currentStageIndex + 1) / stageProgression.length) * 100)
            }
          })
        });
      });

      await page.goto('/chat?sessionId=stage-progression-session');

      // Simulate multiple stage progressions
      for (let i = 0; i < 3; i++) {
        // Mock decision point
        await page.locator('[data-testid="decision-approve"]').waitFor();
        await page.click('[data-testid="decision-approve"]');
        
        // Verify stage progression
        const expectedStage = stageProgression[i + 1].replace('_', ' ');
        await expect(page.locator('[data-testid="current-stage"]')).toContainText(expectedStage);
        await expect(page.locator('[data-testid="chat-message"]').last()).toContainText(`Moving to ${expectedStage}`);
      }
    });

    test('should detect stage completion and trigger decision points through API', async ({ page }) => {
      let stageCompletionDetected = false;

      await page.route('**/chat/crew/next', async route => {
        // Simulate stage completion detection
        if (!stageCompletionDetected) {
          stageCompletionDetected = true;
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'completion-detection-session',
              messages: [{
                id: 'completion-detection-msg',
                content: 'Stage analysis complete. All completion criteria have been met.',
                sender: 'agent',
                timestamp: Date.now(),
                agentMetadata: {
                  agentId: 'business-analyst',
                  agentName: 'Completion Detector'
                }
              }],
              status: 'awaiting_decision',
              pendingDecision: true,
              stageCompletion: {
                detected: true,
                criteria: [
                  'Business requirements identified',
                  'Stakeholder analysis completed', 
                  'Success metrics defined'
                ],
                completionPercentage: 100,
                readyForDecision: true
              }
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'completion-detection-session',
              messages: [{
                id: 'regular-msg',
                content: 'Regular workflow message.',
                sender: 'agent',
                timestamp: Date.now()
              }],
              status: 'active'
            })
          });
        }
      });

      await page.goto('/chat?sessionId=completion-detection-session');
      await page.click('[data-testid="next-message-button"]');

      // Verify completion detection
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('All completion criteria have been met');
      await expect(page.locator('[data-testid="decision-buttons"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-completion-indicator"]')).toContainText('100%');
      await expect(page.locator('[data-testid="completion-criteria"]')).toContainText('Business requirements identified');
    });

    test('should persist workflow state across API calls', async ({ page }) => {
      const persistentSessionId = 'state-persistence-session';
      const workflowState = {
        currentStage: 'SOLUTION_DESIGN',
        progress: 65,
        completedStages: ['PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION'],
        agentContributions: 3,
        decisionHistory: [
          { stage: 'PROBLEM_CAPTURE', decision: 'approve' }
        ]
      };

      await page.route(`**/chat/crew/status/${persistentSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: persistentSessionId,
            ...workflowState,
            messages: [{
              id: 'persistence-msg',
              content: 'Workflow state persisted across API calls.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            statePersistence: {
              lastSaved: Date.now(),
              stateVersion: '1.0',
              persistenceVerified: true
            }
          })
        });
      });

      await page.goto(`/chat?sessionId=${persistentSessionId}`);

      // Verify state persistence
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Solution Design');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '65');
      await expect(page.locator('[data-testid="completed-stages-count"]')).toContainText('2');
      await expect(page.locator('[data-testid="agent-contributions-count"]')).toContainText('3');
      await expect(page.locator('[data-testid="decision-history-count"]')).toContainText('1');
      await expect(page.locator('[data-testid="state-persistence-indicator"]')).toBeVisible();
    });

    test('should validate stage transition logic and validation rules', async ({ page }) => {
      const transitionRules = {
        'PROBLEM_CAPTURE': {
          canAdvanceTo: ['PROBLEM_CLARIFICATION'],
          requirements: ['business_requirements', 'stakeholder_analysis']
        },
        'PROBLEM_CLARIFICATION': {
          canAdvanceTo: ['SOLUTION_DESIGN'],
          requirements: ['clarified_requirements', 'constraint_identification']
        },
        'SOLUTION_DESIGN': {
          canAdvanceTo: ['IMPLEMENTATION_PLAN'],
          requirements: ['architecture_design', 'technical_specifications']
        }
      };

      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        const currentStage = requestBody.currentStage || 'PROBLEM_CAPTURE';
        const rules = transitionRules[currentStage as keyof typeof transitionRules];
        
        if (requestBody.decision === 'approve' && rules) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: requestBody.sessionId,
              messages: [{
                id: 'transition-validation-msg',
                content: `Transition validated: ${currentStage} → ${rules.canAdvanceTo[0]}`,
                sender: 'system',
                timestamp: Date.now()
              }],
              status: 'active',
              currentStage: rules.canAdvanceTo[0],
              transitionValidation: {
                fromStage: currentStage,
                toStage: rules.canAdvanceTo[0],
                requirementsMet: rules.requirements,
                validTransition: true
              }
            })
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid stage transition',
              code: 'INVALID_TRANSITION',
              currentStage: currentStage
            })
          });
        }
      });

      await page.goto('/chat?sessionId=transition-validation-session');
      
      // Test valid transition
      await page.addInitScript(() => {
        window.currentStage = 'PROBLEM_CAPTURE';
      });
      
      await page.click('[data-testid="decision-approve"]');
      
      // Verify successful transition
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('PROBLEM_CAPTURE → PROBLEM_CLARIFICATION');
      await expect(page.locator('[data-testid="transition-validation-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="requirements-met"]')).toContainText('business_requirements');
    });
  });
});