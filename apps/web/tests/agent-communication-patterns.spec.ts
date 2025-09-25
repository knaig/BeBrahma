import { test, expect } from '@playwright/test';
import { setupMockServer } from './utils/test-helpers';

test.describe('Agent Communication Patterns', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockServer(page);
  });

  test.describe('Agent Role Validation', () => {
    test('should validate Business Analyst messages focus on requirements and stakeholder analysis', async ({ page }) => {
      const businessAnalystResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'ba-msg-1',
          content: 'I need to conduct a thorough stakeholder analysis for your e-commerce platform. Let me identify the key business requirements:\n\n**Primary Stakeholders:**\n• End customers (buyers)\n• Vendors/sellers\n• Platform administrators\n• Payment processors\n\n**Core Business Requirements:**\n• Multi-vendor marketplace functionality\n• Secure payment processing\n• Inventory management\n• Customer relationship management\n• Analytics and reporting\n\n**Success Criteria:**\n• User acquisition targets\n• Revenue goals\n• Performance benchmarks\n\nCould you provide more details about your target market and expected transaction volume?',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'business-analyst',
            agentName: 'Alex Chen',
            agentTitle: 'Senior Business Analyst',
            agentDepartment: 'Strategy',
            expertise: ['Requirements Analysis', 'Stakeholder Management', 'Business Process Design']
          }
        }],
        status: 'active',
        currentStage: 'PROBLEM_CAPTURE'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(businessAnalystResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
      
      // Validate Business Analyst focus areas
      expect(messageContent).toContain('stakeholder analysis');
      expect(messageContent).toContain('business requirements');
      expect(messageContent).toContain('Success Criteria');
      expect(messageContent).toContain('target market');
      
      // Verify agent metadata
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Alex Chen');
      await expect(page.locator('[data-testid="agent-department"]').last()).toHaveText('Strategy');
    });

    test('should validate Solution Architect messages address technical architecture', async ({ page }) => {
      const solutionArchitectResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'sa-msg-1',
          content: 'Based on the business requirements, I recommend a microservices architecture approach for your e-commerce platform:\n\n**Technical Architecture:**\n• **API Gateway** - Request routing and authentication\n• **User Service** - Authentication and user management\n• **Product Catalog Service** - Product information and search\n• **Order Management Service** - Order processing and fulfillment\n• **Payment Service** - Transaction processing and security\n• **Notification Service** - Email and SMS communications\n\n**Technology Stack:**\n• **Backend**: Node.js with Express or FastAPI with Python\n• **Database**: PostgreSQL for transactions, Redis for caching\n• **Message Queue**: Apache Kafka for event streaming\n• **Container Orchestration**: Kubernetes\n• **Cloud Platform**: AWS or Google Cloud\n\n**Scalability Considerations:**\n• Horizontal scaling with load balancers\n• Database sharding for high-volume transactions\n• CDN integration for static assets\n• Caching strategies for performance optimization\n\nShould we explore specific technology choices for each service?',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'solution-architect',
            agentName: 'Sarah Rodriguez',
            agentTitle: 'Principal Solution Architect',
            agentDepartment: 'Technical',
            expertise: ['System Architecture', 'Cloud Infrastructure', 'API Design', 'Microservices']
          }
        }],
        status: 'active',
        currentStage: 'SOLUTION_DESIGN'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(solutionArchitectResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
      
      // Validate Solution Architect focus areas
      expect(messageContent).toContain('microservices architecture');
      expect(messageContent).toContain('Technical Architecture');
      expect(messageContent).toContain('Technology Stack');
      expect(messageContent).toContain('Scalability Considerations');
      expect(messageContent).toContain('API Gateway');
      expect(messageContent).toContain('Kubernetes');
      
      // Verify agent metadata
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Sarah Rodriguez');
      await expect(page.locator('[data-testid="agent-department"]').last()).toHaveText('Technical');
    });

    test('should validate Smart Planner messages provide project coordination and strategy', async ({ page }) => {
      const smartPlannerResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'sp-msg-1',
          content: 'Let me break down the project into manageable phases with strategic milestones:\n\n**Phase 1: Foundation (Weeks 1-4)**\n• Set up development environment and CI/CD\n• Implement core user authentication\n• Develop basic product catalog\n• **Milestone**: MVP user registration and product browsing\n\n**Phase 2: Core Functionality (Weeks 5-8)**\n• Shopping cart and checkout process\n• Payment gateway integration\n• Order management system\n• **Milestone**: Complete customer purchase flow\n\n**Phase 3: Vendor Platform (Weeks 9-12)**\n• Vendor onboarding and management\n• Multi-vendor product listings\n• Commission and payout systems\n• **Milestone**: Multi-vendor marketplace launch\n\n**Phase 4: Optimization (Weeks 13-16)**\n• Performance optimization and scaling\n• Advanced search and filtering\n• Analytics and reporting dashboard\n• **Milestone**: Platform optimization and analytics\n\n**Resource Allocation:**\n• 2 Backend developers\n• 1 Frontend developer\n• 1 DevOps engineer\n• 1 QA engineer\n\n**Risk Management:**\n• Payment security compliance\n• Third-party integration dependencies\n• Performance under high load\n\nShall we dive deeper into any specific phase or risk mitigation strategies?',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'smart-planner',
            agentName: 'Michael Thompson',
            agentTitle: 'Strategic Project Planner',
            agentDepartment: 'Strategy',
            expertise: ['Project Management', 'Strategic Planning', 'Resource Allocation', 'Risk Management']
          }
        }],
        status: 'active',
        currentStage: 'IMPLEMENTATION_PLAN'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(smartPlannerResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
      
      // Validate Smart Planner focus areas
      expect(messageContent).toContain('phases with strategic milestones');
      expect(messageContent).toContain('Resource Allocation');
      expect(messageContent).toContain('Risk Management');
      expect(messageContent).toContain('Milestone');
      expect(messageContent).toContain('Phase 1: Foundation');
      
      // Verify agent metadata
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Michael Thompson');
      await expect(page.locator('[data-testid="agent-title"]').last()).toHaveText('Strategic Project Planner');
    });

    test('should validate Developer messages cover implementation and technical solutions', async ({ page }) => {
      const developerResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'dev-msg-1',
          content: 'I\'ll provide implementation details for the core e-commerce functionality:\n\n**User Authentication Implementation:**\n```javascript\n// JWT-based authentication with refresh tokens\nconst authMiddleware = (req, res, next) => {\n  const token = req.headers.authorization?.split(\' \')[1];\n  if (!token) return res.status(401).json({ error: \'No token provided\' });\n  \n  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {\n    if (err) return res.status(403).json({ error: \'Invalid token\' });\n    req.user = decoded;\n    next();\n  });\n};\n```\n\n**Product Catalog API Design:**\n• **GET /api/products** - List products with pagination and filters\n• **GET /api/products/:id** - Get product details\n• **POST /api/products** - Create new product (vendors only)\n• **PUT /api/products/:id** - Update product\n• **DELETE /api/products/:id** - Remove product\n\n**Database Schema Considerations:**\n• **Users**: id, email, password_hash, role, created_at\n• **Products**: id, vendor_id, name, description, price, inventory, category_id\n• **Orders**: id, user_id, total_amount, status, created_at\n• **Order_Items**: id, order_id, product_id, quantity, unit_price\n\n**Performance Optimizations:**\n• Database indexing on frequently queried fields\n• Redis caching for product catalog\n• Image optimization and CDN integration\n• API response compression with gzip\n\n**Security Implementations:**\n• Input validation and sanitization\n• SQL injection prevention with parameterized queries\n• Rate limiting for API endpoints\n• HTTPS enforcement and CORS configuration\n\nWould you like me to elaborate on any specific implementation aspect?',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'developer',
            agentName: 'Emma Wilson',
            agentTitle: 'Senior Full-Stack Developer',
            agentDepartment: 'Technical',
            expertise: ['Full-Stack Development', 'API Design', 'Database Design', 'Security Implementation']
          }
        }],
        status: 'active',
        currentStage: 'IMPLEMENTATION_PLAN'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(developerResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
      
      // Validate Developer focus areas
      expect(messageContent).toContain('implementation details');
      expect(messageContent).toContain('API Design');
      expect(messageContent).toContain('Database Schema');
      expect(messageContent).toContain('Performance Optimizations');
      expect(messageContent).toContain('Security Implementations');
      expect(messageContent).toContain('```javascript');
      
      // Verify agent metadata
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Emma Wilson');
      await expect(page.locator('[data-testid="agent-title"]').last()).toHaveText('Senior Full-Stack Developer');
    });

    test('should validate QA Tester messages focus on quality assurance and testing strategies', async ({ page }) => {
      const qaTesterResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'qa-msg-1',
          content: 'I\'ll outline comprehensive testing strategies for the e-commerce platform:\n\n**Testing Pyramid Structure:**\n• **Unit Tests (70%)** - Individual component testing\n• **Integration Tests (20%)** - API and service integration\n• **End-to-End Tests (10%)** - Full user journey validation\n\n**Unit Testing Strategy:**\n```javascript\n// Example: Product service unit test\ndescribe(\'ProductService\', () => {\n  it(\'should calculate discount correctly\', () => {\n    const product = new Product({ price: 100, discount: 0.1 });\n    expect(product.getFinalPrice()).toBe(90);\n  });\n});\n```\n\n**API Testing Framework:**\n• **Tools**: Jest, Supertest, Postman/Newman\n• **Coverage**: All CRUD operations, authentication flows\n• **Scenarios**: Success cases, error handling, edge cases\n• **Performance**: Load testing with Artillery or k6\n\n**End-to-End Testing:**\n• **Tools**: Playwright or Cypress\n• **Critical User Journeys**:\n  - User registration and login\n  - Product search and filtering\n  - Add to cart and checkout process\n  - Payment processing\n  - Order confirmation and tracking\n\n**Security Testing:**\n• **Authentication**: Token validation, session management\n• **Authorization**: Role-based access control\n• **Input Validation**: SQL injection, XSS prevention\n• **Data Privacy**: PCI compliance for payment data\n\n**Performance Testing:**\n• **Load Testing**: Normal expected traffic\n• **Stress Testing**: Peak traffic scenarios\n• **Spike Testing**: Sudden traffic increases\n• **Volume Testing**: Large dataset handling\n\n**Quality Gates:**\n• 80% code coverage minimum\n• All critical path tests must pass\n• No high-severity security vulnerabilities\n• Performance benchmarks met\n\n**Test Data Management:**\n• Synthetic data generation\n• Test environment isolation\n• Data cleanup procedures\n• Privacy-compliant test datasets\n\nShall we prioritize specific testing areas or discuss test automation strategies?',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'qa-tester',
            agentName: 'David Kim',
            agentTitle: 'Lead QA Engineer',
            agentDepartment: 'Quality',
            expertise: ['Test Automation', 'Performance Testing', 'Security Testing', 'Quality Assurance']
          }
        }],
        status: 'active',
        currentStage: 'TESTING_STRATEGY'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(qaTesterResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
      
      // Validate QA Tester focus areas
      expect(messageContent).toContain('testing strategies');
      expect(messageContent).toContain('Testing Pyramid');
      expect(messageContent).toContain('Unit Tests');
      expect(messageContent).toContain('Security Testing');
      expect(messageContent).toContain('Performance Testing');
      expect(messageContent).toContain('Quality Gates');
      
      // Verify agent metadata
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('David Kim');
      await expect(page.locator('[data-testid="agent-department"]').last()).toHaveText('Quality');
    });
  });

  test.describe('Agent Collaboration Patterns', () => {
    test('should demonstrate sequential agent contributions within workflow stages', async ({ page }) => {
      const agentSequence = [
        {
          agentId: 'business-analyst',
          agentName: 'Alex Chen',
          content: 'I\'ve identified the core business requirements. The primary focus should be on multi-vendor marketplace functionality.',
          stage: 'PROBLEM_CAPTURE'
        },
        {
          agentId: 'solution-architect',
          agentName: 'Sarah Rodriguez',
          content: 'Building on Alex\'s analysis, I recommend a microservices architecture to support the multi-vendor requirements he identified.',
          stage: 'PROBLEM_CAPTURE'
        },
        {
          agentId: 'smart-planner',
          agentName: 'Michael Thompson',
          content: 'Considering both the business requirements from Alex and Sarah\'s architectural approach, I suggest a phased implementation strategy.',
          stage: 'PROBLEM_CAPTURE'
        }
      ];

      let requestCount = 0;
      await page.route('**/chat/crew/next', async route => {
        const agent = agentSequence[requestCount % agentSequence.length];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: `collab-msg-${requestCount + 1}`,
              content: agent.content,
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: agent.agentId,
                agentName: agent.agentName,
                agentTitle: 'Test Title'
              }
            }],
            status: 'active',
            currentStage: agent.stage
          })
        });
        requestCount++;
      });

      await page.goto('/dashboard?sessionId=test-session-123');

      // Test first agent message
      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Alex Chen');
      let content = await page.locator('[data-testid="agent-message"]').last().textContent();
      expect(content).toContain('core business requirements');

      // Test second agent builds on first
      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Sarah Rodriguez');
      content = await page.locator('[data-testid="agent-message"]').last().textContent();
      expect(content).toContain('Building on Alex\'s analysis');
      expect(content).toContain('multi-vendor requirements he identified');

      // Test third agent builds on previous two
      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Michael Thompson');
      content = await page.locator('[data-testid="agent-message"]').last().textContent();
      expect(content).toContain('Considering both the business requirements from Alex');
      expect(content).toContain('Sarah\'s architectural approach');
    });

    test('should validate agent responses build context awareness', async ({ page }) => {
      const contextualResponses = [
        {
          agentId: 'business-analyst',
          content: 'The user wants to build an e-commerce platform. Key requirement: multi-vendor support with 10,000+ products.',
          context: []
        },
        {
          agentId: 'solution-architect',
          content: 'Given the 10,000+ product requirement mentioned by Alex, we need a scalable database architecture with proper indexing.',
          context: ['business-analyst']
        },
        {
          agentId: 'smart-planner',
          content: 'Based on Alex\'s vendor requirements and Sarah\'s scalability concerns, I recommend starting with MVP for 100 vendors.',
          context: ['business-analyst', 'solution-architect']
        }
      ];

      let responseIndex = 0;
      await page.route('**/chat/crew/next', async route => {
        const response = contextualResponses[responseIndex];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: `context-msg-${responseIndex + 1}`,
              content: response.content,
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: response.agentId,
                agentName: `Agent ${responseIndex + 1}`,
                contextReferences: response.context
              }
            }],
            status: 'active',
            currentStage: 'PROBLEM_CAPTURE'
          })
        });
        responseIndex++;
      });

      await page.goto('/dashboard?sessionId=test-session-123');

      // First agent establishes context
      await page.click('[data-testid="next-message-button"]');
      let content = await page.locator('[data-testid="agent-message"]').last().textContent();
      expect(content).toContain('10,000+ products');

      // Second agent references first agent's information
      await page.click('[data-testid="next-message-button"]');
      content = await page.locator('[data-testid="agent-message"]').last().textContent();
      expect(content).toContain('10,000+ product requirement mentioned by Alex');

      // Third agent references both previous agents
      await page.click('[data-testid="next-message-button"]');
      content = await page.locator('[data-testid="agent-message"]').last().textContent();
      expect(content).toContain('Alex\'s vendor requirements');
      expect(content).toContain('Sarah\'s scalability concerns');
    });

    test('should handle agent expertise alignment with stage objectives', async ({ page }) => {
      const stageAgentAlignment = [
        {
          stage: 'PROBLEM_CAPTURE',
          expectedAgents: ['business-analyst', 'smart-planner'],
          content: 'Business Analyst leading requirements gathering with Smart Planner providing strategic context.'
        },
        {
          stage: 'SOLUTION_DESIGN',
          expectedAgents: ['solution-architect', 'developer'],
          content: 'Solution Architect designing system architecture while Developer provides implementation insights.'
        },
        {
          stage: 'TESTING_STRATEGY',
          expectedAgents: ['qa-tester', 'developer'],
          content: 'QA Tester defining testing framework with Developer ensuring testability of implementation.'
        }
      ];

      for (const stageTest of stageAgentAlignment) {
        await page.route('**/chat/crew/next', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'test-session-123',
              messages: [{
                id: `stage-msg-${stageTest.stage}`,
                content: stageTest.content,
                sender: 'agent',
                timestamp: Date.now(),
                agentMetadata: {
                  agentId: stageTest.expectedAgents[0],
                  stageAlignment: stageTest.expectedAgents
                }
              }],
              status: 'active',
              currentStage: stageTest.stage
            })
          });
        });

        await page.goto(`/dashboard?sessionId=test-session-123&stage=${stageTest.stage}`);
        await page.click('[data-testid="next-message-button"]');

        await expect(page.locator('[data-testid="current-stage"]')).toContainText(stageTest.stage.replace(/_/g, ' '));
        
        const content = await page.locator('[data-testid="agent-message"]').last().textContent();
        for (const agentType of stageTest.expectedAgents) {
          expect(content?.toLowerCase()).toContain(agentType.replace('-', ' '));
        }
      }
    });
  });

  test.describe('Agent Metadata Handling', () => {
    test('should display agent avatars based on agentId and role', async ({ page }) => {
      const agentAvatarTests = [
        { agentId: 'business-analyst', expectedAvatarClass: 'avatar-business-analyst' },
        { agentId: 'solution-architect', expectedAvatarClass: 'avatar-solution-architect' },
        { agentId: 'smart-planner', expectedAvatarClass: 'avatar-smart-planner' },
        { agentId: 'developer', expectedAvatarClass: 'avatar-developer' },
        { agentId: 'qa-tester', expectedAvatarClass: 'avatar-qa-tester' }
      ];

      for (const avatarTest of agentAvatarTests) {
        await page.route('**/chat/crew/next', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'test-session-123',
              messages: [{
                id: `avatar-msg-${avatarTest.agentId}`,
                content: `Message from ${avatarTest.agentId}`,
                sender: 'agent',
                timestamp: Date.now(),
                agentMetadata: {
                  agentId: avatarTest.agentId,
                  agentName: 'Test Agent',
                  agentTitle: 'Test Title'
                }
              }],
              status: 'active'
            })
          });
        });

        await page.goto('/dashboard?sessionId=test-session-123');
        await page.click('[data-testid="next-message-button"]');

        await expect(page.locator('[data-testid="agent-avatar"]').last())
          .toHaveAttribute('data-agent-id', avatarTest.agentId);
        
        // Verify avatar styling or class is applied correctly
        const avatarElement = page.locator('[data-testid="agent-avatar"]').last();
        await expect(avatarElement).toHaveClass(new RegExp(avatarTest.expectedAvatarClass));
      }
    });

    test('should maintain agent metadata consistency across message exchanges', async ({ page }) => {
      const consistentAgent = {
        agentId: 'business-analyst',
        agentName: 'Alex Chen',
        agentTitle: 'Senior Business Analyst',
        agentDepartment: 'Strategy',
        expertise: ['Requirements Analysis', 'Stakeholder Management']
      };

      const messages = [
        'Initial business analysis message...',
        'Follow-up requirements clarification...',
        'Final business requirements summary...'
      ];

      let messageIndex = 0;
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: `consistency-msg-${messageIndex}`,
              content: messages[messageIndex],
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: consistentAgent
            }],
            status: 'active'
          })
        });
        messageIndex++;
      });

      await page.goto('/dashboard?sessionId=test-session-123');

      // Send multiple messages and verify metadata consistency
      for (let i = 0; i < messages.length; i++) {
        await page.click('[data-testid="next-message-button"]');
        
        await expect(page.locator('[data-testid="agent-name"]').last())
          .toHaveText(consistentAgent.agentName);
        await expect(page.locator('[data-testid="agent-title"]').last())
          .toHaveText(consistentAgent.agentTitle);
        await expect(page.locator('[data-testid="agent-department"]').last())
          .toHaveText(consistentAgent.agentDepartment);
        await expect(page.locator('[data-testid="agent-avatar"]').last())
          .toHaveAttribute('data-agent-id', consistentAgent.agentId);
      }
    });

    test('should group agents by department categories', async ({ page }) => {
      const departmentGroups = {
        'Strategy': ['business-analyst', 'smart-planner'],
        'Technical': ['solution-architect', 'developer'],
        'Quality': ['qa-tester']
      };

      for (const [department, agentIds] of Object.entries(departmentGroups)) {
        for (const agentId of agentIds) {
          await page.route('**/chat/crew/next', async route => {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                sessionId: 'test-session-123',
                messages: [{
                  id: `dept-msg-${agentId}`,
                  content: `Message from ${agentId} in ${department} department`,
                  sender: 'agent',
                  timestamp: Date.now(),
                  agentMetadata: {
                    agentId,
                    agentName: `${agentId} Name`,
                    agentTitle: `${agentId} Title`,
                    agentDepartment: department
                  }
                }],
                status: 'active'
              })
            });
          });

          await page.goto('/dashboard?sessionId=test-session-123');
          await page.click('[data-testid="next-message-button"]');

          await expect(page.locator('[data-testid="agent-department"]').last())
            .toHaveText(department);
          
          // Verify department-based styling or grouping
          const departmentClass = `department-${department.toLowerCase()}`;
          await expect(page.locator('[data-testid="agent-message"]').last())
            .toHaveClass(new RegExp(departmentClass));
        }
      }
    });
  });

  test.describe('Multi-Agent Decision Making', () => {
    test('should demonstrate consensus building across multiple agent contributions', async ({ page }) => {
      const consensusScenario = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'consensus-msg-1',
          content: '**Agent Consensus Summary:**\n\n**Business Analyst (Alex Chen)**: ✅ Agrees with microservices approach for scalability\n**Solution Architect (Sarah Rodriguez)**: ✅ Confirms technical feasibility and recommends AWS\n**Smart Planner (Michael Thompson)**: ✅ Supports phased implementation strategy\n**Developer (Emma Wilson)**: ✅ Validates implementation complexity as manageable\n**QA Tester (David Kim)**: ✅ Confirms testing strategy is comprehensive\n\n**Consensus Reached**: All agents agree to proceed with microservices architecture using AWS cloud platform with phased implementation approach.',
          sender: 'system',
          timestamp: Date.now(),
          messageType: 'agent_consensus',
          consensusData: {
            agentVotes: {
              'business-analyst': 'approve',
              'solution-architect': 'approve',
              'smart-planner': 'approve',
              'developer': 'approve',
              'qa-tester': 'approve'
            },
            consensusLevel: 'unanimous'
          }
        }],
        status: 'awaiting_decision',
        pending_decision: true
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(consensusScenario)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      await expect(page.locator('[data-testid="consensus-message"]')).toContainText('Agent Consensus Summary');
      await expect(page.locator('[data-testid="consensus-message"]')).toContainText('Consensus Reached');
      
      // Verify all agent votes are displayed
      await expect(page.locator('[data-testid="agent-vote-business-analyst"]')).toContainText('✅ Agrees');
      await expect(page.locator('[data-testid="agent-vote-solution-architect"]')).toContainText('✅ Confirms');
      
      await expect(page.locator('[data-testid="consensus-level"]')).toHaveText('unanimous');
    });

    test('should handle agent disagreements and conflict resolution', async ({ page }) => {
      const conflictScenario = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'conflict-msg-1',
          content: '**Agent Discussion - Conflicting Views:**\n\n**Solution Architect (Sarah Rodriguez)**: 🔶 Recommends microservices for scalability\n**Developer (Emma Wilson)**: ⚠️ Concerns about microservices complexity for initial launch\n**Smart Planner (Michael Thompson)**: 🔄 Suggests compromise: monolith-first approach with microservices migration plan\n\n**Conflict Resolution:**\nAfter discussion, agents agree on a hybrid approach:\n1. Start with modular monolith for faster initial deployment\n2. Design with microservices patterns for future migration\n3. Plan microservices transition after MVP validation\n\nThis balances Emma\'s concern about initial complexity with Sarah\'s scalability requirements.',
          sender: 'system',
          timestamp: Date.now(),
          messageType: 'agent_conflict_resolution',
          conflictData: {
            originalPositions: {
              'solution-architect': 'microservices',
              'developer': 'monolith',
              'smart-planner': 'hybrid'
            },
            resolution: 'modular_monolith_with_migration_plan'
          }
        }],
        status: 'active'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(conflictScenario)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      await expect(page.locator('[data-testid="conflict-resolution-message"]')).toContainText('Conflicting Views');
      await expect(page.locator('[data-testid="conflict-resolution-message"]')).toContainText('Conflict Resolution');
      await expect(page.locator('[data-testid="conflict-resolution-message"]')).toContainText('hybrid approach');
    });
  });

  test.describe('Communication Quality Validation', () => {
    test('should validate agent message length and detail appropriateness', async ({ page }) => {
      const messageLengthTests = [
        {
          agentId: 'business-analyst',
          content: 'I need comprehensive business analysis for your e-commerce platform. This requires detailed stakeholder mapping, requirements gathering, and success criteria definition. Let me break this down into key areas: market analysis, user personas, business model validation, competitive landscape assessment, and ROI projections.',
          expectedLength: 'detailed'
        },
        {
          agentId: 'smart-planner',
          content: 'Quick update: Phase 1 on track, moving to Phase 2 next week.',
          expectedLength: 'concise'
        }
      ];

      for (const lengthTest of messageLengthTests) {
        await page.route('**/chat/crew/next', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'test-session-123',
              messages: [{
                id: `length-msg-${lengthTest.agentId}`,
                content: lengthTest.content,
                sender: 'agent',
                timestamp: Date.now(),
                agentMetadata: {
                  agentId: lengthTest.agentId,
                  messageLength: lengthTest.expectedLength
                }
              }],
              status: 'active'
            })
          });
        });

        await page.goto('/dashboard?sessionId=test-session-123');
        await page.click('[data-testid="next-message-button"]');

        const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
        
        if (lengthTest.expectedLength === 'detailed') {
          expect(messageContent?.length).toBeGreaterThan(200);
        } else if (lengthTest.expectedLength === 'concise') {
          expect(messageContent?.length).toBeLessThan(100);
        }
      }
    });

    test('should validate agent questions are relevant to expertise areas', async ({ page }) => {
      const expertiseQuestions = [
        {
          agentId: 'business-analyst',
          questions: [
            'What is your target customer segment?',
            'What are your revenue projections?',
            'Who are your key stakeholders?'
          ]
        },
        {
          agentId: 'solution-architect',
          questions: [
            'What is your expected concurrent user load?',
            'Do you have preferred cloud platforms?',
            'What are your data compliance requirements?'
          ]
        },
        {
          agentId: 'qa-tester',
          questions: [
            'What is your acceptable bug tolerance?',
            'Do you need automated testing?',
            'What are your performance benchmarks?'
          ]
        }
      ];

      for (const expertiseTest of expertiseQuestions) {
        const questionContent = expertiseTest.questions.join('\n• ');
        
        await page.route('**/chat/crew/next', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'test-session-123',
              messages: [{
                id: `questions-msg-${expertiseTest.agentId}`,
                content: `I have some questions in my area of expertise:\n\n• ${questionContent}`,
                sender: 'agent',
                timestamp: Date.now(),
                agentMetadata: {
                  agentId: expertiseTest.agentId,
                  questionTopics: expertiseTest.questions
                }
              }],
              status: 'active'
            })
          });
        });

        await page.goto('/dashboard?sessionId=test-session-123');
        await page.click('[data-testid="next-message-button"]');

        const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
        
        // Verify questions are present in the message
        for (const question of expertiseTest.questions) {
          expect(messageContent).toContain(question);
        }
        
        // Verify questions are relevant to agent's role
        if (expertiseTest.agentId === 'business-analyst') {
          expect(messageContent).toMatch(/target customer|revenue|stakeholder/i);
        } else if (expertiseTest.agentId === 'solution-architect') {
          expect(messageContent).toMatch(/user load|cloud platform|compliance/i);
        } else if (expertiseTest.agentId === 'qa-tester') {
          expect(messageContent).toMatch(/bug tolerance|automated testing|performance/i);
        }
      }
    });
  });
});