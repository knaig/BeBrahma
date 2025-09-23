// packages/types/src/index.ts

// Agent Types
export interface AgentRole {
  name: string;
  persona: string;
  systemPrompt: string;
  goals: string[];
  constraints: string[];
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  agentName?: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface Citation {
  url: string;
  title: string;
  snippet: string;
  confidence: number;
}

export interface AgentState {
  agentName: string;
  messages: AgentMessage[];
  currentTask?: string;
  outputs?: Record<string, any>;
  retryCount: number;
  totalTokens: number;
  totalCost: number;
}

// CAMEL Configuration
export interface CAMELConfig {
  maxTurns: number;
  maxRetries: number;
  requireCitations: boolean;
  costLimit: number;
  timeoutMs: number;
}

// Run Types
export interface RunConfig {
  projectId: string;
  userId: string;
  stage: Stage;
  input: string;
  config?: Partial<CAMELConfig>;
}

export interface RunResult {
  runId: string;
  status: RunStatus;
  artifacts: Artifact[];
  conversation: AgentMessage[];
  totalCost: number;
  totalTokens: number;
  duration: number;
}

// Artifact Types
export interface ProblemBrief {
  title: string;
  statement: string;
  context: string;
  constraints: string[];
  successCriteria: string[];
  assumptions: string[];
}

export interface MarketSnapshot {
  marketSize: {
    value: number;
    unit: string;
    source: Citation;
  };
  competitors: Competitor[];
  trends: MarketTrend[];
  painPoints: PainPoint[];
  regulations?: string[];
}

export interface Competitor {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  marketShare?: number;
  source: Citation;
}

export interface MarketTrend {
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  source: Citation;
}

export interface PainPoint {
  description: string;
  severity: number; // 1-10
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  affectedUsers: string;
  source?: Citation;
}

export interface GTMSeed {
  personas: Persona[];
  channels: Channel[];
  experiments: Experiment[];
  timeline: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface Persona {
  name: string;
  role: string;
  company: string;
  painPoints: string[];
  goals: string[];
  objections: string[];
  reachability: number; // 1-10
}

export interface Channel {
  name: string;
  type: 'organic' | 'paid' | 'partnership' | 'direct';
  cost: number;
  timeToResults: string;
  confidence: number;
  tactics: string[];
}

export interface Experiment {
  name: string;
  hypothesis: string;
  channel: string;
  budget: number;
  duration: string;
  successMetrics: string[];
  steps: string[];
}

export interface BuildPrompt {
  title: string;
  overview: string;
  technicalRequirements: TechnicalRequirement[];
  userStories: UserStory[];
  dataModel: DataModel[];
  apiEndpoints: APIEndpoint[];
  uiComponents: UIComponent[];
  testPlan: TestCase[];
  deploymentNotes: string;
}

export interface TechnicalRequirement {
  category: string;
  requirements: string[];
  priority: 'must' | 'should' | 'could';
}

export interface UserStory {
  as: string;
  want: string;
  so: string;
  acceptanceCriteria: string[];
}

export interface DataModel {
  name: string;
  fields: Field[];
  relationships: string[];
}

export interface Field {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  request