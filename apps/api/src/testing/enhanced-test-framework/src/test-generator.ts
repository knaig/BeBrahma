import { TestSuite, ConversationFlow, TestCycle, CodeChange } from './types';
import { CONVERSATION_FLOWS, FLOW_CATEGORIES } from './conversation-flows';
import { USER_PERSONAS } from './user-personas';

export class TestGenerator {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async generateTestSuites(cycle: TestCycle): Promise<TestSuite[]> {
    const testSuites: TestSuite[] = [];

    // Generate test suites based on business domains
    const businessDomains = this.getUniqueBusinessDomains();
    
    for (const domain of businessDomains) {
      const testSuite = await this.createTestSuite(domain, cycle);
      testSuites.push(testSuite);
    }

    // Generate specialized test suites
    const specializedSuites = await this.generateSpecializedSuites(cycle);
    testSuites.push(...specializedSuites);

    return testSuites;
  }

  private getUniqueBusinessDomains(): string[] {
    return [...new Set(CONVERSATION_FLOWS.map(flow => flow.businessDomain))];
  }

  private async createTestSuite(domain: string, cycle: TestCycle): Promise<TestSuite> {
    const flows = CONVERSATION_FLOWS.filter(flow => flow.businessDomain === domain);
    
    // Calculate estimated duration based on complexity and flow count
    const estimatedDuration = this.calculateEstimatedDuration(flows);
    
    // Determine priority based on domain importance
    const priority = this.determinePriority(domain);
    
    // Identify dependencies
    const dependencies = this.identifyDependencies(domain);

    return {
      id: `suite-${domain.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: `${domain} Test Suite`,
      description: `Comprehensive testing of ${domain} scenarios across multiple user personas and complexity levels`,
      conversationFlows: flows,
      priority,
      estimatedDuration,
      dependencies
    };
  }

  private calculateEstimatedDuration(flows: ConversationFlow[]): number {
    let totalDuration = 0;
    
    for (const flow of flows) {
      switch (flow.complexity) {
        case 'low':
          totalDuration += 1; // 1 minute
          break;
        case 'medium':
          totalDuration += 2; // 2 minutes
          break;
        case 'high':
          totalDuration += 4; // 4 minutes
          break;
      }
    }
    
    // Add buffer for setup and teardown
    return totalDuration + 2;
  }

  private determinePriority(domain: string): 'low' | 'medium' | 'high' | 'critical' {
    // Define domain priorities based on business importance
    const criticalDomains = ['SaaS Business Planning', 'FinTech Product Strategy'];
    const highPriorityDomains = ['Investment Due Diligence', 'EV Infrastructure Consulting'];
    const mediumPriorityDomains = ['E-commerce Marketing', 'Retail Operations'];
    
    if (criticalDomains.includes(domain)) return 'critical';
    if (highPriorityDomains.includes(domain)) return 'high';
    if (mediumPriorityDomains.includes(domain)) return 'medium';
    return 'low';
  }

  private identifyDependencies(domain: string): string[] {
    const dependencies: string[] = [];
    
    // Add domain-specific dependencies
    switch (domain) {
      case 'FinTech Product Strategy':
        dependencies.push('SaaS Business Planning'); // FinTech builds on SaaS concepts
        break;
      case 'Investment Due Diligence':
        dependencies.push('SaaS Business Planning'); // Investment analysis needs business understanding
        break;
      case 'E-commerce Marketing':
        dependencies.push('Retail Operations'); // Marketing builds on operational understanding
        break;
    }
    
    return dependencies;
  }

  private async generateSpecializedSuites(cycle: TestCycle): Promise<TestSuite[]> {
    const specializedSuites: TestSuite[] = [];

    // Context Continuity Test Suite
    const contextContinuitySuite = await this.createContextContinuitySuite();
    specializedSuites.push(contextContinuitySuite);

    // Multi-Persona Test Suite
    const multiPersonaSuite = await this.createMultiPersonaSuite();
    specializedSuites.push(multiPersonaSuite);

    // Edge Case Test Suite
    const edgeCaseSuite = await this.createEdgeCaseSuite();
    specializedSuites.push(edgeCaseSuite);

    return specializedSuites;
  }

  private async createContextContinuitySuite(): Promise<TestSuite> {
    // Select flows that are good for testing context continuity
    const contextFlows = CONVERSATION_FLOWS.filter(flow => 
      flow.followUpPrompts.length >= 3 && 
      flow.complexity === 'high'
    ).slice(0, 3); // Limit to 3 flows

    return {
      id: `suite-context-continuity-${Date.now()}`,
      name: 'Context Continuity Test Suite',
      description: 'Specialized testing of conversation context retention across multiple turns',
      conversationFlows: contextFlows,
      priority: 'high',
      estimatedDuration: 8, // 8 minutes for context testing
      dependencies: []
    };
  }

  private async createMultiPersonaSuite(): Promise<TestSuite> {
    // Create flows that test the same scenario across different personas
    const multiPersonaFlows: ConversationFlow[] = [];
    
    // Test business strategy planning across different expertise levels
    const strategyFlows = CONVERSATION_FLOWS.filter(flow => 
      flow.conversationType === 'strategy'
    );
    
    for (const flow of strategyFlows.slice(0, 2)) {
      // Create variations for different personas
      const variations = this.createPersonaVariations(flow);
      multiPersonaFlows.push(...variations);
    }

    return {
      id: `suite-multi-persona-${Date.now()}`,
      name: 'Multi-Persona Test Suite',
      description: 'Testing the same scenarios across different user personas and expertise levels',
      conversationFlows: multiPersonaFlows,
      priority: 'medium',
      estimatedDuration: 6,
      dependencies: []
    };
  }

  private createPersonaVariations(originalFlow: ConversationFlow): ConversationFlow[] {
    const variations: ConversationFlow[] = [];
    
    // Create variations for different expertise levels
    const expertiseLevels: ('beginner' | 'intermediate' | 'expert')[] = ['beginner', 'intermediate', 'expert'];
    
    for (const expertise of expertiseLevels) {
      const persona = USER_PERSONAS.find(p => p.expertise === expertise && p.industry.toLowerCase().includes(originalFlow.businessDomain.toLowerCase().split(' ')[0]));
      
      if (persona) {
        const variation: ConversationFlow = {
          ...originalFlow,
          id: `${originalFlow.id}-${expertise}-${Date.now()}`,
          name: `${originalFlow.name} (${expertise} level)`,
          userPersona: persona,
          complexity: expertise === 'beginner' ? 'low' : expertise === 'intermediate' ? 'medium' : 'high'
        };
        variations.push(variation);
      }
    }
    
    return variations;
  }

  private async createEdgeCaseSuite(): Promise<TestSuite> {
    // Create flows that test edge cases and unusual scenarios
    const edgeCaseFlows: ConversationFlow[] = [];
    
    // Test with very long prompts
    const longPromptFlow = this.createLongPromptFlow();
    edgeCaseFlows.push(longPromptFlow);
    
    // Test with ambiguous prompts
    const ambiguousPromptFlow = this.createAmbiguousPromptFlow();
    edgeCaseFlows.push(ambiguousPromptFlow);
    
    // Test with rapid-fire questions
    const rapidFireFlow = this.createRapidFireFlow();
    edgeCaseFlows.push(rapidFireFlow);

    return {
      id: `suite-edge-cases-${Date.now()}`,
      name: 'Edge Case Test Suite',
      description: 'Testing system behavior with unusual inputs and edge cases',
      conversationFlows: edgeCaseFlows,
      priority: 'low',
      estimatedDuration: 4,
      dependencies: []
    };
  }

  private createLongPromptFlow(): ConversationFlow {
    const longPrompt = `I need comprehensive guidance on developing a multi-tenant SaaS platform for enterprise resource planning that integrates with existing legacy systems, handles complex data migrations, ensures data security and compliance with GDPR, SOC2, and HIPAA regulations, provides real-time analytics and reporting, supports multiple payment gateways, implements role-based access control, offers white-label customization options, includes mobile applications for iOS and Android, provides comprehensive API documentation, handles automated testing and deployment pipelines, manages customer support and ticketing systems, and scales to handle millions of concurrent users while maintaining 99.9% uptime. Can you help me break this down into manageable phases and identify the key technical challenges and business considerations?`;
    
    return {
      id: `edge-case-long-prompt-${Date.now()}`,
      name: 'Long Prompt Handling',
      description: 'Testing system ability to handle very long and complex prompts',
      userPersona: USER_PERSONAS.find(p => p.id === 'consultant-dr-james')!,
      initialPrompt: longPrompt,
      followUpPrompts: [
        'What are the top 3 technical challenges I should focus on first?',
        'How would you estimate the timeline for this project?',
        'What are the biggest risks I should be aware of?'
      ],
      expectedContexts: [
        'Multi-tenant SaaS platform',
        'Enterprise resource planning',
        'Legacy system integration',
        'Data security and compliance',
        'Scalability requirements'
      ],
      expectedRelevance: [
        'Technical architecture',
        'Project planning',
        'Risk assessment',
        'Compliance requirements'
      ],
      businessDomain: 'SaaS Business Planning',
      complexity: 'high',
      conversationType: 'strategy',
      successCriteria: [
        'Handles long prompt without truncation',
        'Provides structured response',
        'Addresses key technical challenges',
        'Offers actionable next steps'
      ],
      failureScenarios: [
        'Prompt gets truncated',
        'Response is generic',
        'No technical depth',
        'Missing actionable guidance'
      ]
    };
  }

  private createAmbiguousPromptFlow(): ConversationFlow {
    return {
      id: `edge-case-ambiguous-${Date.now()}`,
      name: 'Ambiguous Prompt Handling',
      description: 'Testing system ability to handle unclear or ambiguous user requests',
      userPersona: USER_PERSONAS.find(p => p.id === 'startup-founder-sarah')!,
      initialPrompt: 'I want to make money online. How do I do that?',
      followUpPrompts: [
        'What about with my current skills?',
        'How much can I expect to earn?',
        'When will I see results?'
      ],
      expectedContexts: [
        'Online business opportunities',
        'Skill assessment',
        'Income expectations',
        'Timeline for results'
      ],
      expectedRelevance: [
        'Business opportunity evaluation',
        'Skill development',
        'Realistic expectations',
        'Action planning'
      ],
      businessDomain: 'Business Strategy',
      complexity: 'medium',
      conversationType: 'planning',
      successCriteria: [
        'Asks clarifying questions',
        'Provides realistic expectations',
        'Offers specific strategies',
        'Addresses skill requirements'
      ],
      failureScenarios: [
        'Generic advice',
        'Unrealistic promises',
        'No skill assessment',
        'Missing action steps'
      ]
    };
  }

  private createRapidFireFlow(): ConversationFlow {
    return {
      id: `edge-case-rapid-fire-${Date.now()}`,
      name: 'Rapid Fire Questions',
      description: 'Testing system ability to handle multiple rapid questions while maintaining context',
      userPersona: USER_PERSONAS.find(p => p.id === 'product-manager-mike')!,
      initialPrompt: 'What is the best pricing strategy for a SaaS product?',
      followUpPrompts: [
        'What about freemium vs premium?',
        'How do I price for enterprise?',
        'What metrics should I track?',
        'How do I handle price increases?',
        'What about international pricing?',
        'How do I test pricing changes?'
      ],
      expectedContexts: [
        'SaaS pricing strategies',
        'Freemium vs premium models',
        'Enterprise pricing',
        'Pricing metrics',
        'Price increase strategies',
        'International pricing',
        'Pricing experiments'
      ],
      expectedRelevance: [
        'Pricing strategy',
        'Business model',
        'Revenue optimization',
        'Market expansion'
      ],
      businessDomain: 'SaaS Business Planning',
      complexity: 'high',
      conversationType: 'strategy',
      successCriteria: [
        'Maintains context across rapid questions',
        'Provides specific pricing guidance',
        'Addresses each question individually',
        'Offers actionable strategies'
      ],
      failureScenarios: [
        'Loses context',
        'Generic responses',
        'Ignores follow-up questions',
        'No specific guidance'
      ]
    };
  }

  async updateTestSuites(testSuites: TestSuite[], changes: CodeChange[]): Promise<TestSuite[]> {
    // Update test suites based on code changes
    const updatedSuites = [...testSuites];
    
    for (const change of changes) {
      if (change.filePath.includes('ai/') || change.filePath.includes('conversation/')) {
        // AI-related changes might affect conversation quality
        await this.updateConversationQualityTests(updatedSuites, change);
      }
      
      if (change.filePath.includes('context/') || change.filePath.includes('memory/')) {
        // Context-related changes might affect context retention
        await this.updateContextRetentionTests(updatedSuites, change);
      }
      
      if (change.filePath.includes('business/') || change.filePath.includes('domain/')) {
        // Business logic changes might affect domain expertise
        await this.updateDomainExpertiseTests(updatedSuites, change);
      }
    }
    
    return updatedSuites;
  }

  private async updateConversationQualityTests(testSuites: TestSuite[], change: CodeChange): Promise<void> {
    // Add new test cases to validate conversation quality improvements
    for (const suite of testSuites) {
      if (suite.name.includes('Context Continuity') || suite.name.includes('Multi-Persona')) {
        // Add quality validation tests
        const qualityTestFlow = this.createQualityValidationFlow(change);
        suite.conversationFlows.push(qualityTestFlow);
        suite.estimatedDuration += 2; // Add 2 minutes for new test
      }
    }
  }

  private async updateContextRetentionTests(testSuites: TestSuite[], change: CodeChange): Promise<void> {
    // Add context retention validation tests
    for (const suite of testSuites) {
      if (suite.name.includes('Context Continuity')) {
        const contextTestFlow = this.createContextRetentionFlow(change);
        suite.conversationFlows.push(contextTestFlow);
        suite.estimatedDuration += 1;
      }
    }
  }

  private async updateDomainExpertiseTests(testSuites: TestSuite[], change: CodeChange): Promise<void> {
    // Add domain expertise validation tests
    for (const suite of testSuites) {
      if (suite.name.includes('Business Strategy') || suite.name.includes('Financial Analysis')) {
        const expertiseTestFlow = this.createDomainExpertiseFlow(change);
        suite.conversationFlows.push(expertiseTestFlow);
        suite.estimatedDuration += 2;
      }
    }
  }

  private createQualityValidationFlow(change: CodeChange): ConversationFlow {
    return {
      id: `quality-validation-${Date.now()}`,
      name: 'Quality Validation Test',
      description: `Testing improvements from change: ${change.description}`,
      userPersona: USER_PERSONAS.find(p => p.id === 'consultant-dr-james')!,
      initialPrompt: 'Based on recent improvements to our conversation system, can you demonstrate enhanced quality in your responses?',
      followUpPrompts: [
        'How has the quality improved specifically?',
        'What new capabilities do you now have?',
        'Can you show me an example of the improvement?'
      ],
      expectedContexts: [
        'System improvements',
        'Quality enhancements',
        'New capabilities',
        'Demonstration examples'
      ],
      expectedRelevance: [
        'Quality improvement',
        'System capabilities',
        'User experience',
        'Technical enhancements'
      ],
      businessDomain: 'System Testing',
      complexity: 'medium',
      conversationType: 'analysis',
      successCriteria: [
        'Demonstrates improved quality',
        'Shows new capabilities',
        'Provides specific examples',
        'Maintains context'
      ],
      failureScenarios: [
        'No quality improvement shown',
        'Generic responses',
        'No new capabilities demonstrated',
        'Context loss'
      ]
    };
  }

  private createContextRetentionFlow(change: CodeChange): ConversationFlow {
    return {
      id: `context-retention-${Date.now()}`,
      name: 'Context Retention Validation',
      description: `Testing context retention improvements from change: ${change.description}`,
      userPersona: USER_PERSONAS.find(p => p.id === 'startup-founder-sarah')!,
      initialPrompt: 'I want to start a business. Let me tell you about my idea step by step.',
      followUpPrompts: [
        'First, I want to create a mobile app for...',
        'The target market is...',
        'My main challenge is...',
        'Now, based on everything I told you, what should I focus on first?'
      ],
      expectedContexts: [
        'Business idea',
        'Mobile app concept',
        'Target market',
        'Main challenges',
        'Prioritized next steps'
      ],
      expectedRelevance: [
        'Business planning',
        'Strategic guidance',
        'Priority setting',
        'Action planning'
      ],
      businessDomain: 'Business Strategy',
      complexity: 'medium',
      conversationType: 'strategy',
      successCriteria: [
        'Remembers all details',
        'Builds on previous information',
        'Provides contextual advice',
        'Maintains conversation flow'
      ],
      failureScenarios: [
        'Forgets earlier details',
        'Generic advice',
        'No context building',
        'Disconnected responses'
      ]
    };
  }

  private createDomainExpertiseFlow(change: CodeChange): ConversationFlow {
    return {
      id: `domain-expertise-${Date.now()}`,
      name: 'Domain Expertise Validation',
      description: `Testing domain expertise improvements from change: ${change.description}`,
      userPersona: USER_PERSONAS.find(p => p.id === 'investor-alex')!,
      initialPrompt: 'I need to evaluate a Series B investment in a B2B SaaS company. What should I look for?',
      followUpPrompts: [
        'How do I assess their unit economics?',
        'What customer metrics are most important?',
        'How do I evaluate their competitive moat?',
        'What are the biggest red flags to watch for?'
      ],
      expectedContexts: [
        'Series B investment criteria',
        'B2B SaaS evaluation',
        'Unit economics analysis',
        'Customer metrics',
        'Competitive moat assessment',
        'Risk identification'
      ],
      expectedRelevance: [
        'Investment analysis',
        'Due diligence',
        'Risk assessment',
        'Valuation methodology'
      ],
      businessDomain: 'Investment Due Diligence',
      complexity: 'high',
      conversationType: 'analysis',
      successCriteria: [
        'Demonstrates deep domain knowledge',
        'Provides specific evaluation criteria',
        'Offers actionable insights',
        'Addresses investment risks'
      ],
      failureScenarios: [
        'Generic investment advice',
        'No specific criteria',
        'Missing risk assessment',
        'Superficial analysis'
      ]
    };
  }
}
