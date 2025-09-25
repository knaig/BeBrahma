export interface UserPersona {
  id: string;
  name: string;
  role: string;
  expertise: 'beginner' | 'intermediate' | 'expert';
  industry: string;
  companySize: 'startup' | 'sme' | 'enterprise';
  useCase: string;
  painPoints: string[];
  goals: string[];
  technicalLevel: 'non-technical' | 'semi-technical' | 'technical';
}

export interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  userPersona: UserPersona;
  initialPrompt: string;
  followUpPrompts: string[];
  expectedContexts: string[];
  expectedRelevance: string[];
  businessDomain: string;
  complexity: 'low' | 'medium' | 'high';
  conversationType: 'strategy' | 'research' | 'analysis' | 'planning' | 'troubleshooting';
  successCriteria: string[];
  failureScenarios: string[];
}

export interface TestCycle {
  id: string;
  name: string;
  version: string;
  startDate: Date;
  endDate?: Date;
  status: 'planned' | 'running' | 'completed' | 'failed';
  testSuites: TestSuite[];
  results: TestResults;
  changes: CodeChange[];
  observations: string[];
  recommendations: string[];
  competitiveAnalysis?: CompetitiveAnalysis;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  conversationFlows: ConversationFlow[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // in minutes
  dependencies: string[];
}

export interface TestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  executionTime: number;
  scores: {
    contextRetention: number;
    responseRelevance: number;
    conversationContinuity: number;
    businessInsightQuality: number;
    responseCoherence: number;
    overallScore: number;
  };
  detailedResults: TestResult[];
  performanceMetrics: PerformanceMetrics;
}

export interface TestResult {
  testId: string;
  conversationFlow: ConversationFlow;
  status: 'passed' | 'failed' | 'skipped';
  scores: {
    contextRetention: number;
    responseRelevance: number;
    conversationContinuity: number;
    businessInsightQuality: number;
    responseCoherence: number;
    averageScore: number;
  };
  feedback: string[];
  recommendations: string[];
  executionTime: number;
  errorMessage?: string;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  apiCallCount: number;
  errorRate: number;
}

export interface CodeChange {
  id: string;
  description: string;
  filePath: string;
  changeType: 'addition' | 'modification' | 'deletion' | 'refactor';
  reason: string;
  impact: 'low' | 'medium' | 'high';
  status: 'planned' | 'implemented' | 'tested' | 'deployed';
  commitHash?: string;
  pullRequestUrl?: string;
}

export interface CompetitiveAnalysis {
  competitor: 'perplexity' | 'claude' | 'gpt4' | 'other';
  comparisonMetrics: {
    contextRetention: number;
    responseRelevance: number;
    businessInsightQuality: number;
    responseTime: number;
    costPerQuery: number;
  };
  advantages: string[];
  disadvantages: string[];
  gaps: string[];
  recommendations: string[];
  competitiveAdvantage: string;
}

export interface TestConfiguration {
  openaiApiKey: string;
  crewaiEndpoint: string;
  competitorApiKeys: Record<string, string>;
  testTimeout: number;
  retryAttempts: number;
  parallelExecution: boolean;
  maxConcurrentTests: number;
  reportFormats: ('json' | 'markdown' | 'html' | 'csv')[];
  outputDirectory: string;
}

export interface TestExecutionOptions {
  cycleId?: string;
  testSuiteIds?: string[];
  userPersonaIds?: string[];
  businessDomains?: string[];
  complexityLevels?: string[];
  dryRun?: boolean;
  generateReport?: boolean;
  compareWithCompetitor?: boolean;
  saveResults?: boolean;
}
