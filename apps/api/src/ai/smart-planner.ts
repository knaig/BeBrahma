export interface DataPlan {
  id: string;
  problemStatement: string;
  userId: string;
  sessionId: string;
  createdAt: Date;
  status: 'planning' | 'executing' | 'completed' | 'paused';
  
  // Data Collection Strategy
  dataRequirements: DataRequirement[];
  dataSources: DataSource[];
  freeSources: FreeSource[];
  
  // Budget Allocation
  totalBudget: number;
  allocatedBudget: {
    apis: number;
    llm: number;
    tools: number;
    buffer: number;
  };
  remainingBudget: number;
  
  // Execution Plan
  phases: ExecutionPhase[];
  currentPhase: number;
  estimatedDuration: number; // minutes
  
  // Resource Constraints
  maxConcurrentAgents: number;
  maxAPICallsPerPhase: number;
  maxLLMTokensPerPhase: number;
  
  // Monitoring
  actualUsage: {
    apis: number;
    llm: number;
    tools: number;
    totalCost: number;
  };
  lastUpdated: Date;
}

export interface DataRequirement {
  id: string;
  category: 'market_research' | 'technical_feasibility' | 'user_research' | 'competitive_analysis' | 'financial_modeling';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  dataPoints: string[];
  estimatedCost: number;
  alternatives: string[]; // Free alternatives if available
}

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'scraping' | 'database';
  cost: number;
  quota: number;
  reliability: number; // 0-1 score
  alternatives: string[];
  priority: 'primary' | 'secondary' | 'fallback';
}

export interface FreeSource {
  id: string;
  name: string;
  type: 'public_api' | 'scraping' | 'community_data';
  quality: number; // 0-1 score
  limitations: string[];
  reliability: number;
}

export interface ExecutionPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration: number;
  requiredAgents: string[];
  requiredData: string[];
  budgetAllocation: number;
  dependencies: string[];
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface ResourceBudget {
  userId: string;
  problemId: string;
  monthlyBudget: number;
  dailyLimit: number;
  perProblemLimit: number;
  currentUsage: {
    today: number;
    thisMonth: number;
    thisProblem: number;
  };
  restrictions: {
    maxConcurrentProblems: number;
    maxAPICallsPerDay: number;
    maxLLMTokensPerDay: number;
    maxToolCallsPerDay: number;
  };
}

export class SmartPlannerAgent {
  private dataPlans: Map<string, DataPlan> = new Map();
  private freeDataSources: Map<string, FreeSource> = new Map();
  
  // Cost estimates (per 1K tokens, per API call, per tool call)
  private costEstimates = {
    gpt4: 0.03, // $0.03 per 1K tokens
    gpt35: 0.002, // $0.002 per 1K tokens
    claude: 0.015, // $0.015 per 1K tokens
    apiCall: 0.001, // $0.001 per API call (average)
    toolCall: 0.005, // $0.005 per tool call (average)
    scraping: 0.0005 // $0.0005 per page scrape
  };

  constructor() {
    this.initializeFreeDataSources();
  }

  private initializeFreeDataSources() {
    // High-quality free data sources
    this.freeDataSources.set('reddit', {
      id: 'reddit',
      name: 'Reddit Community Data',
      type: 'community_data',
      quality: 0.85,
      limitations: ['Rate limited', 'Community bias', 'Variable quality'],
      reliability: 0.9
    });

    this.freeDataSources.set('github', {
      id: 'github',
      name: 'GitHub Repository Data',
      type: 'public_api',
      quality: 0.9,
      limitations: ['Public repos only', 'No private insights'],
      reliability: 0.95
    });

    this.freeDataSources.set('newsapi', {
      id: 'newsapi',
      name: 'News API (Free Tier)',
      type: 'public_api',
      quality: 0.8,
      limitations: ['1,000 requests/day', 'Limited historical data'],
      reliability: 0.85
    });

    this.freeDataSources.set('google-trends', {
      id: 'google-trends',
      name: 'Google Trends (Fallback)',
      type: 'scraping',
      quality: 0.75,
      limitations: ['Derived data', 'No real-time API'],
      reliability: 0.8
    });

    this.freeDataSources.set('linkedin-public', {
      id: 'linkedin-public',
      name: 'LinkedIn Public Data',
      type: 'scraping',
      quality: 0.7,
      limitations: ['Public profiles only', 'Rate limited', 'TOS compliance'],
      reliability: 0.6
    });
  }

  public async createDataPlan(
    problemStatement: string,
    userId: string,
    sessionId: string,
    userBudget: number = 200
  ): Promise<DataPlan> {
    
    // Analyze the problem to determine data requirements
    const dataRequirements = await this.analyzeProblemRequirements(problemStatement);
    
    // Calculate optimal budget allocation
    const budgetAllocation = this.calculateBudgetAllocation(dataRequirements, userBudget);
    
    // Select data sources (free vs. paid)
    const dataSources = await this.selectOptimalDataSources(dataRequirements, budgetAllocation.apis);
    const freeSources = this.selectFreeAlternatives(dataRequirements);
    
    // Create execution phases
    const phases = this.createExecutionPhases(dataRequirements);
    
    // Estimate total cost and duration
    const estimatedDuration = this.estimateTotalDuration(phases);
    
    const dataPlan: DataPlan = {
      id: `plan_${Date.now()}`,
      problemStatement,
      userId,
      sessionId,
      createdAt: new Date(),
      status: 'planning',
      
      dataRequirements,
      dataSources,
      freeSources,
      
      totalBudget: userBudget,
      allocatedBudget: budgetAllocation,
      remainingBudget: userBudget - (budgetAllocation.apis + budgetAllocation.llm + budgetAllocation.tools + budgetAllocation.buffer),
      
      phases,
      currentPhase: 0,
      estimatedDuration,
      
      maxConcurrentAgents: this.calculateOptimalAgentCount(dataRequirements),
      maxAPICallsPerPhase: Math.ceil(budgetAllocation.apis / phases.length / this.costEstimates.apiCall),
      maxLLMTokensPerPhase: Math.ceil(budgetAllocation.llm / phases.length / this.costEstimates.gpt4 * 1000),
      
      actualUsage: {
        apis: 0,
        llm: 0,
        tools: 0,
        totalCost: 0
      },
      lastUpdated: new Date()
    };

    this.dataPlans.set(dataPlan.id, dataPlan);
    return dataPlan;
  }

  private async analyzeProblemRequirements(problemStatement: string): Promise<DataRequirement[]> {
    // This would typically use an LLM to analyze the problem
    // For now, using a rule-based approach
    
    const requirements: DataRequirement[] = [];
    
    // Market Research
    if (this.containsKeywords(problemStatement, ['market', 'industry', 'competition', 'trends'])) {
      requirements.push({
        id: 'market_research',
        category: 'market_research',
        priority: 'critical',
        description: 'Understand market size, trends, and competitive landscape',
        dataPoints: ['Market size', 'Growth rate', 'Key players', 'Trends'],
        estimatedCost: 50,
        alternatives: ['Google Trends', 'Industry reports', 'Reddit discussions']
      });
    }
    
    // User Research
    if (this.containsKeywords(problemStatement, ['user', 'customer', 'pain point', 'need'])) {
      requirements.push({
        id: 'user_research',
        category: 'user_research',
        priority: 'high',
        description: 'Identify user pain points and needs',
        dataPoints: ['User demographics', 'Pain points', 'Use cases', 'Feedback'],
        estimatedCost: 30,
        alternatives: ['Reddit communities', 'Quora', 'Stack Overflow', 'Twitter']
      });
    }
    
    // Technical Feasibility
    if (this.containsKeywords(problemStatement, ['technical', 'feasibility', 'implementation', 'technology'])) {
      requirements.push({
        id: 'technical_feasibility',
        category: 'technical_feasibility',
        priority: 'high',
        description: 'Assess technical implementation challenges',
        dataPoints: ['Technology stack', 'Complexity', 'Resources needed', 'Timeline'],
        estimatedCost: 25,
        alternatives: ['GitHub repositories', 'Stack Overflow', 'Technical blogs', 'Documentation']
      });
    }
    
    // Competitive Analysis
    if (this.containsKeywords(problemStatement, ['competitor', 'competition', 'alternative', 'differentiation'])) {
      requirements.push({
        id: 'competitive_analysis',
        category: 'competitive_analysis',
        priority: 'medium',
        description: 'Analyze competitors and market positioning',
        dataPoints: ['Competitor features', 'Pricing', 'Market share', 'Strengths/weaknesses'],
        estimatedCost: 40,
        alternatives: ['Company websites', 'Product reviews', 'Social media', 'News articles']
      });
    }
    
    // Financial Modeling
    if (this.containsKeywords(problemStatement, ['revenue', 'pricing', 'cost', 'financial', 'business model'])) {
      requirements.push({
        id: 'financial_modeling',
        category: 'financial_modeling',
        priority: 'medium',
        description: 'Develop financial projections and pricing strategy',
        dataPoints: ['Revenue models', 'Pricing strategies', 'Cost structure', 'Unit economics'],
        estimatedCost: 35,
        alternatives: ['Industry benchmarks', 'Public company data', 'Case studies', 'Expert blogs']
      });
    }
    
    return requirements;
  }

  private calculateBudgetAllocation(requirements: DataRequirement[], totalBudget: number): DataPlan['allocatedBudget'] {
    // Allocate based on priority and cost
    let apiBudget = 0;
    let llmBudget = 0;
    let toolsBudget = 0;
    
    requirements.forEach(req => {
      if (req.priority === 'critical') {
        apiBudget += req.estimatedCost * 0.8; // 80% of critical requirements
      } else if (req.priority === 'high') {
        apiBudget += req.estimatedCost * 0.6; // 60% of high priority
      } else {
        apiBudget += req.estimatedCost * 0.4; // 40% of medium/low priority
      }
    });
    
    // LLM usage (estimated based on problem complexity)
    const problemComplexity = requirements.length;
    llmBudget = Math.min(totalBudget * 0.3, problemComplexity * 15); // Max 30% of budget
    
    // Tool calling (estimated based on requirements)
    toolsBudget = Math.min(totalBudget * 0.1, requirements.length * 5); // Max 10% of budget
    
    // Buffer for unexpected needs
    const buffer = Math.max(totalBudget * 0.15, 20); // At least 15% or $20
    
    return {
      apis: Math.min(apiBudget, totalBudget * 0.6),
      llm: llmBudget,
      tools: toolsBudget,
      buffer
    };
  }

  private async selectOptimalDataSources(requirements: DataRequirement[], apiBudget: number): Promise<DataSource[]> {
    const sources: DataSource[] = [];
    
    requirements.forEach(req => {
      if (req.category === 'market_research' && apiBudget >= 30) {
        sources.push({
          id: 'hubspot',
          name: 'HubSpot API',
          type: 'api',
          cost: 25,
          quota: 1000,
          reliability: 0.95,
          alternatives: ['LinkedIn', 'Salesforce'],
          priority: 'primary'
        });
      }
      
      if (req.category === 'user_research' && apiBudget >= 20) {
        sources.push({
          id: 'linkedin-jobs',
          name: 'LinkedIn Jobs API',
          type: 'api',
          cost: 20,
          quota: 500,
          reliability: 0.9,
          alternatives: ['Indeed', 'Glassdoor'],
          priority: 'primary'
        });
      }
      
      if (req.category === 'competitive_analysis' && apiBudget >= 25) {
        sources.push({
          id: 'crunchbase',
          name: 'Crunchbase API',
          type: 'api',
          cost: 25,
          quota: 200,
          reliability: 0.85,
          alternatives: ['LinkedIn', 'Company websites'],
          priority: 'secondary'
        });
      }
    });
    
    return sources;
  }

  private selectFreeAlternatives(requirements: DataRequirement[]): FreeSource[] {
    const freeSources: FreeSource[] = [];
    
    requirements.forEach(req => {
      if (req.category === 'market_research') {
        freeSources.push(this.freeDataSources.get('google-trends')!);
        freeSources.push(this.freeDataSources.get('newsapi')!);
      }
      
      if (req.category === 'user_research') {
        freeSources.push(this.freeDataSources.get('reddit')!);
      }
      
      if (req.category === 'technical_feasibility') {
        freeSources.push(this.freeDataSources.get('github')!);
      }
    });
    
    return freeSources.filter(source => source !== undefined);
  }

  private createExecutionPhases(requirements: DataRequirement[]): ExecutionPhase[] {
    const phases: ExecutionPhase[] = [];
    
    // Phase 1: Initial Research
    phases.push({
      id: 'phase_1',
      name: 'Initial Research & Data Collection',
      description: 'Gather foundational data from free and paid sources',
      order: 1,
      estimatedDuration: 15,
      requiredAgents: ['research-lead', 'data-analyst'],
      requiredData: ['market_research', 'user_research'],
      budgetAllocation: 40,
      dependencies: [],
      status: 'pending'
    });
    
    // Phase 2: Deep Analysis
    if (requirements.some(r => r.priority === 'critical')) {
      phases.push({
        id: 'phase_2',
        name: 'Deep Analysis & Validation',
        description: 'Validate findings and conduct detailed analysis',
        order: 2,
        estimatedDuration: 20,
        requiredAgents: ['industry-analyst', 'competitive-intelligence'],
        requiredData: ['competitive_analysis', 'technical_feasibility'],
        budgetAllocation: 35,
        dependencies: ['phase_1'],
        status: 'pending'
      });
    }
    
    // Phase 3: Strategy Development
    phases.push({
      id: 'phase_3',
      name: 'Strategy Development & Recommendations',
      description: 'Develop actionable insights and strategic recommendations',
      order: 3,
      estimatedDuration: 25,
      requiredAgents: ['ceo', 'product-manager'],
      requiredData: ['financial_modeling'],
      budgetAllocation: 25,
      dependencies: ['phase_1', 'phase_2'],
      status: 'pending'
    });
    
    return phases;
  }

  private estimateTotalDuration(phases: ExecutionPhase[]): number {
    return phases.reduce((total, phase) => total + phase.estimatedDuration, 0);
  }

  private calculateOptimalAgentCount(requirements: DataRequirement[]): number {
    // Base: 2 agents minimum
    let agentCount = 2;
    
    // Add agents based on complexity
    if (requirements.length > 3) agentCount++;
    if (requirements.some(r => r.priority === 'critical')) agentCount++;
    if (requirements.some(r => r.category === 'financial_modeling')) agentCount++;
    
    // Cap at 5 agents to avoid "too many cooks"
    return Math.min(agentCount, 5);
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  public getDataPlan(planId: string): DataPlan | undefined {
    return this.dataPlans.get(planId);
  }

  public updateDataPlan(planId: string, updates: Partial<DataPlan>): void {
    const plan = this.dataPlans.get(planId);
    if (plan) {
      Object.assign(plan, updates, { lastUpdated: new Date() });
    }
  }

  public getActivePlans(): DataPlan[] {
    return Array.from(this.dataPlans.values()).filter(plan => plan.status === 'executing');
  }

  public pauseDataPlan(planId: string): void {
    this.updateDataPlan(planId, { status: 'paused' });
  }

  public resumeDataPlan(planId: string): void {
    this.updateDataPlan(planId, { status: 'executing' });
  }

  public getBudgetRecommendations(userId: string, problemType: string): ResourceBudget {
    // This would analyze user's problem and provide budget recommendations
    const baseBudget = 200;
    const complexityMultiplier = this.getComplexityMultiplier(problemType);
    
    return {
      userId,
      problemId: `problem_${Date.now()}`,
      monthlyBudget: baseBudget * complexityMultiplier,
      dailyLimit: (baseBudget * complexityMultiplier) / 30,
      perProblemLimit: baseBudget * complexityMultiplier * 0.8,
      currentUsage: {
        today: 0,
        thisMonth: 0,
        thisProblem: 0
      },
      restrictions: {
        maxConcurrentProblems: 2,
        maxAPICallsPerDay: 100,
        maxLLMTokensPerDay: 100000,
        maxToolCallsPerDay: 50
      }
    };
  }

  private getComplexityMultiplier(problemType: string): number {
    const multipliers: Record<string, number> = {
      'simple_validation': 0.5,
      'market_research': 1.0,
      'product_development': 1.5,
      'business_strategy': 2.0,
      'enterprise_solution': 3.0
    };
    
    return multipliers[problemType] || 1.0;
  }
}
