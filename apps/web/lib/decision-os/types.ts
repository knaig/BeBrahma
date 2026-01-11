// Decision OS Core Types - Revenue Loop Wedge

export type EvidenceRung =
  | 'synthetic'      // LLM-generated, no real user data
  | 'attention'      // Pageviews, clicks, opens
  | 'intent'         // Form fills, demo requests, replies
  | 'commitment'     // Signed contracts, paid invoices
  | 'retention';     // Renewals, expansion

export type DecisionGrade = 0 | 1 | 2 | 3;

export type SpeedMode = 'fast' | 'slow';

export type FounderProfile = 'sprinter' | 'perfectionist' | 'balanced';

export type DirectionStatus =
  | 'funded'
  | 'pending'
  | 'deferred'
  | 'killed';

export type ExperimentStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'passed'
  | 'failed'
  | 'abandoned';

export type GateType =
  | 'evidence_threshold'
  | 'artifact_required'
  | 'metric_threshold'
  | 'manual_approval';

// Core Entities

export interface Venture {
  id: string;
  name: string;
  userId: string;
  stage: 'customer_discovery' | 'offer' | 'pipeline' | 'first_revenue';
  budgets: {
    hoursPerWeek: number;
    sendsPerWeek: number;
    spendPerWeek: number;
  };
  wipLimits: {
    maxDirections: number;
    maxActiveExperiments: number;
  };
  founderProfile: FounderProfile;
  experienceVariant: 'command_center' | 'in_tools';
  createdAt: string;
  updatedAt: string;
}

export interface Direction {
  id: string;
  ventureId: string;

  // Direction vector
  icp: string;                    // Who
  problem: string;                // What pain
  offer: string;                  // Solution
  channel: string;                // How to reach
  price: string;                  // Price point

  // State
  status: DirectionStatus;
  currentRung: EvidenceRung;
  confidenceScore: number;        // 0-100
  expectedValue: number;          // 0-100

  // Budgets allocated
  allocatedHours: number;
  allocatedSends: number;
  allocatedSpend: number;

  // Kill criteria
  killCriteria: string[];

  createdAt: string;
  updatedAt: string;
}

export interface Experiment {
  id: string;
  directionId: string;
  ventureId: string;

  title: string;
  hypothesis: string;
  approach: string;

  status: ExperimentStatus;
  targetRung: EvidenceRung;

  // Decision grading
  grade: DecisionGrade;
  speedMode: SpeedMode;

  // Cost
  estimatedHours: number;
  estimatedSends: number;
  estimatedSpend: number;

  // Gates
  gates: Gate[];

  // Progress
  startedAt?: string;
  completedAt?: string;

  // Evidence collected
  evidenceIds: string[];

  createdAt: string;
  updatedAt: string;
}

export interface Gate {
  id: string;
  experimentId: string;
  order: number;                  // Sequential evaluation

  type: GateType;
  description: string;
  condition: Record<string, any>; // JSON rule

  status: 'pending' | 'passed' | 'failed';
  evaluatedAt?: string;
  evaluationResult?: Record<string, any>;
}

export interface Evidence {
  id: string;
  ventureId: string;
  directionId: string;
  experimentId?: string;

  rung: EvidenceRung;
  type: string;                   // interview, email_reply, signup, payment, etc.
  description: string;
  data: Record<string, any>;

  source: string;                 // manual, gmail, stripe, etc.
  sourceId?: string;

  createdAt: string;
}

export interface DecisionEvent {
  id: string;
  ventureId: string;
  directionId: string;

  actionType: 'fund' | 'modify' | 'defer' | 'kill';
  reason: string;

  // Context at time of decision
  confidenceScore: number;
  expectedValue: number;
  currentRung: EvidenceRung;

  userId: string;
  createdAt: string;
}

export interface OverrideEvent {
  id: string;
  ventureId: string;
  entityId: string;               // experimentId or directionId
  entityType: 'experiment' | 'direction';

  grade: DecisionGrade;
  mode: SpeedMode;
  actionType: string;             // What they were trying to do
  recommendedAction: string;      // What we recommended
  reason: string;                 // Why they overrode (min 10 chars)

  userId: string;
  createdAt: string;
}

export interface VCMemoLite {
  directionId: string;

  // Deal headline
  headline: string;               // ICP + offer + claim

  // Thesis (3 bullets)
  thesis: string[];

  // Assumption ledger
  topAssumptions: Array<{
    assumption: string;
    rung: EvidenceRung;
    cheapestTest: string;
    estimatedCost: string;
  }>;

  // Next experiment
  nextExperiment: {
    title: string;
    passCriteria: string;
    cost: string;
  };

  // Kill criteria
  killCriteria: string[];
}

export interface DailyPacket {
  ventureId: string;
  date: string;

  topDecision: {
    title: string;
    grade: DecisionGrade;
    speedMode: SpeedMode;
    description: string;
    action: string;
  };

  nextExperiment: {
    title: string;
    gates: string[];
    latestSignals: string[];
  };

  preparedOutputs: Array<{
    type: string;
    title: string;
    description: string;
  }>;
}

// Integration Types

export interface IntegrationProvider {
  id: string;
  name: string;
  type: 'google_workspace' | 'crm' | 'payment' | 'repo';
  status: 'connected' | 'disconnected' | 'error';
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getStatus: () => Promise<'connected' | 'disconnected' | 'error'>;
}

export interface GoogleWorkspaceProvider extends IntegrationProvider {
  type: 'google_workspace';
  fetchScheduledCalls: (since: Date) => Promise<any[]>;
  fetchCustomerEmails: (since: Date) => Promise<any[]>;
}

export interface CRMProvider extends IntegrationProvider {
  type: 'crm';
  fetchPipeline: () => Promise<any>;
  fetchDealMovements: (since: Date) => Promise<any[]>;
}

export interface PaymentProvider extends IntegrationProvider {
  type: 'payment';
  fetchPaymentEvents: (since: Date) => Promise<any[]>;
}

export interface RepoProvider extends IntegrationProvider {
  type: 'repo';
  listRepos: () => Promise<any[]>;
  selectRepo: (repoId: string) => Promise<void>;
  createBranch: (baseBranch: string, newBranchName: string) => Promise<void>;
  openPullRequest: (branch: string, title: string, body: string) => Promise<any>;
}

// Policy Engine Types

export interface PolicyResult {
  allowed: boolean;
  requiresSlowMode: boolean;
  requiresApproval: boolean;
  friction: 'none' | 'soft' | 'hard';
  message?: string;
  recommendations?: string[];
}

export interface PolicyContext {
  venture: Venture;
  direction?: Direction;
  experiment?: Experiment;
  actionType: string;
  targetRung?: EvidenceRung;
}
