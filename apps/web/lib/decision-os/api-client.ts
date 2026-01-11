// Decision OS API Client (with mock fallback)

import {
  Venture,
  Direction,
  Experiment,
  Evidence,
  DecisionEvent,
  OverrideEvent,
  VCMemoLite,
  DailyPacket,
  EvidenceRung,
  DirectionStatus,
} from './types';

// Mock data for development
const MOCK_VENTURE: Venture = {
  id: 'v1',
  name: 'Demo Venture',
  userId: 'user1',
  stage: 'customer_discovery',
  budgets: {
    hoursPerWeek: 20,
    sendsPerWeek: 100,
    spendPerWeek: 500,
  },
  wipLimits: {
    maxDirections: 3,
    maxActiveExperiments: 1,
  },
  founderProfile: 'balanced',
  experienceVariant: 'command_center',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_DIRECTIONS: Direction[] = [
  {
    id: 'd1',
    ventureId: 'v1',
    icp: 'SME finance teams',
    problem: 'Delayed receivables + manual follow-up',
    offer: 'Automated follow-up + payment nudges',
    channel: 'Email + WhatsApp',
    price: '$299/mo',
    status: 'funded',
    currentRung: 'intent',
    confidenceScore: 48,
    expectedValue: 72,
    allocatedHours: 8,
    allocatedSends: 30,
    allocatedSpend: 200,
    killCriteria: [
      'If <10% response rate after 50 sends',
      'If avg deal size <$100/mo',
      'If sales cycle >90 days',
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd2',
    ventureId: 'v1',
    icp: 'Local services businesses',
    problem: 'No-show appointments',
    offer: 'SMS reminder + rescheduling bot',
    channel: 'Direct outreach',
    price: '$149/mo',
    status: 'pending',
    currentRung: 'attention',
    confidenceScore: 35,
    expectedValue: 58,
    allocatedHours: 0,
    allocatedSends: 0,
    allocatedSpend: 0,
    killCriteria: [
      'If <20% interest in interviews',
      'If problem severity <7/10',
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd3',
    ventureId: 'v1',
    icp: 'Creator workflow for interior designers',
    problem: 'Proposal creation takes 4+ hours',
    offer: 'Template library + auto-fill from CRM',
    channel: 'Instagram DM',
    price: '$99/mo',
    status: 'pending',
    currentRung: 'synthetic',
    confidenceScore: 22,
    expectedValue: 45,
    allocatedHours: 0,
    allocatedSends: 0,
    allocatedSpend: 0,
    killCriteria: [
      'If TAM <10K designers',
      'If willingness-to-pay <$50/mo',
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: 'e1',
    directionId: 'd1',
    ventureId: 'v1',
    title: 'Iterate outreach copy + run 30 more cards',
    hypothesis: 'Emphasizing pain (manual follow-up) will increase reply rate',
    approach: 'A/B test: control vs pain-focused subject lines',
    status: 'running',
    targetRung: 'intent',
    grade: 1,
    speedMode: 'fast',
    estimatedHours: 2,
    estimatedSends: 30,
    estimatedSpend: 0,
    gates: [
      {
        id: 'g1',
        experimentId: 'e1',
        order: 1,
        type: 'evidence_threshold',
        description: '30 sends completed',
        condition: { sends_completed: 30 },
        status: 'pending',
      },
      {
        id: 'g2',
        experimentId: 'e1',
        order: 2,
        type: 'metric_threshold',
        description: '5+ demo requests (>15% conversion)',
        condition: { demo_requests: 5, conversion_rate: 0.15 },
        status: 'pending',
      },
    ],
    startedAt: new Date().toISOString(),
    evidenceIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e2',
    directionId: 'd1',
    ventureId: 'v1',
    title: 'B2B SaaS for invoice follow-ups',
    hypothesis: 'Finance teams will schedule demos if we show ROI',
    approach: 'Email 50 CFOs with ROI calculator',
    status: 'queued',
    targetRung: 'intent',
    grade: 2,
    speedMode: 'fast',
    estimatedHours: 4,
    estimatedSends: 50,
    estimatedSpend: 0,
    gates: [
      {
        id: 'g3',
        experimentId: 'e2',
        order: 1,
        type: 'evidence_threshold',
        description: '50 emails sent',
        condition: { emails_sent: 50 },
        status: 'pending',
      },
      {
        id: 'g4',
        experimentId: 'e2',
        order: 2,
        type: 'metric_threshold',
        description: '10+ demo requests (20% conversion)',
        condition: { demo_requests: 10, conversion_rate: 0.20 },
        status: 'pending',
      },
    ],
    evidenceIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class DecisionOSAPIClient {
  private baseURL: string;
  private useMock: boolean;

  constructor(baseURL: string = '/api/v1', useMock: boolean = true) {
    this.baseURL = baseURL;
    this.useMock = useMock;
  }

  // Venture
  async getVenture(ventureId: string): Promise<Venture> {
    if (this.useMock) {
      return Promise.resolve(MOCK_VENTURE);
    }
    const res = await fetch(`${this.baseURL}/ventures/${ventureId}`);
    return res.json();
  }

  async updateVenture(ventureId: string, updates: Partial<Venture>): Promise<Venture> {
    if (this.useMock) {
      return Promise.resolve({ ...MOCK_VENTURE, ...updates });
    }
    const res = await fetch(`${this.baseURL}/ventures/${ventureId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  }

  // Directions
  async getDirections(ventureId: string): Promise<Direction[]> {
    if (this.useMock) {
      return Promise.resolve(MOCK_DIRECTIONS);
    }
    const res = await fetch(`${this.baseURL}/ventures/${ventureId}/directions`);
    return res.json();
  }

  async getTopDirections(ventureId: string, limit: number = 3): Promise<Direction[]> {
    const directions = await this.getDirections(ventureId);
    return directions
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, limit);
  }

  async createDirection(direction: Omit<Direction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Direction> {
    if (this.useMock) {
      const newDirection: Direction = {
        ...direction,
        id: `d${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return Promise.resolve(newDirection);
    }
    const res = await fetch(`${this.baseURL}/directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(direction),
    });
    return res.json();
  }

  async updateDirection(directionId: string, updates: Partial<Direction>): Promise<Direction> {
    if (this.useMock) {
      const direction = MOCK_DIRECTIONS.find((d) => d.id === directionId);
      return Promise.resolve({ ...direction!, ...updates });
    }
    const res = await fetch(`${this.baseURL}/directions/${directionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  }

  // Experiments
  async getExperiments(directionId?: string): Promise<Experiment[]> {
    if (this.useMock) {
      return Promise.resolve(
        directionId
          ? MOCK_EXPERIMENTS.filter((e) => e.directionId === directionId)
          : MOCK_EXPERIMENTS
      );
    }
    const url = directionId
      ? `${this.baseURL}/directions/${directionId}/experiments`
      : `${this.baseURL}/experiments`;
    const res = await fetch(url);
    return res.json();
  }

  async getNextExperiment(ventureId: string): Promise<Experiment | null> {
    const experiments = await this.getExperiments();
    const queued = experiments
      .filter((e) => e.status === 'queued' && e.ventureId === ventureId)
      .sort((a, b) => {
        // Sort by grade (lower first), then by created date
        if (a.grade !== b.grade) return a.grade - b.grade;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    return queued[0] || null;
  }

  async getActiveExperiment(ventureId: string): Promise<Experiment | null> {
    const experiments = await this.getExperiments();
    const active = experiments.find(
      (e) => e.status === 'running' && e.ventureId === ventureId
    );
    return active || null;
  }

  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experiment> {
    if (this.useMock) {
      const newExperiment: Experiment = {
        ...experiment,
        id: `e${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return Promise.resolve(newExperiment);
    }
    const res = await fetch(`${this.baseURL}/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(experiment),
    });
    return res.json();
  }

  async updateExperiment(experimentId: string, updates: Partial<Experiment>): Promise<Experiment> {
    if (this.useMock) {
      const experiment = MOCK_EXPERIMENTS.find((e) => e.id === experimentId);
      return Promise.resolve({ ...experiment!, ...updates });
    }
    const res = await fetch(`${this.baseURL}/experiments/${experimentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  }

  // Evidence
  async addEvidence(evidence: Omit<Evidence, 'id' | 'createdAt'>): Promise<Evidence> {
    if (this.useMock) {
      const newEvidence: Evidence = {
        ...evidence,
        id: `ev${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      return Promise.resolve(newEvidence);
    }
    const res = await fetch(`${this.baseURL}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidence),
    });
    return res.json();
  }

  // Decision Events
  async recordDecision(decision: Omit<DecisionEvent, 'id' | 'createdAt'>): Promise<DecisionEvent> {
    if (this.useMock) {
      const newDecision: DecisionEvent = {
        ...decision,
        id: `de${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      return Promise.resolve(newDecision);
    }
    const res = await fetch(`${this.baseURL}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    });
    return res.json();
  }

  // Override Events
  async recordOverride(override: Omit<OverrideEvent, 'id' | 'createdAt'>): Promise<OverrideEvent> {
    if (this.useMock) {
      const newOverride: OverrideEvent = {
        ...override,
        id: `ov${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      return Promise.resolve(newOverride);
    }
    const res = await fetch(`${this.baseURL}/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(override),
    });
    return res.json();
  }

  // VC Memo Lite
  async getVCMemoLite(directionId: string): Promise<VCMemoLite> {
    if (this.useMock) {
      const direction = MOCK_DIRECTIONS.find((d) => d.id === directionId);
      if (!direction) throw new Error('Direction not found');

      return Promise.resolve({
        directionId,
        headline: `${direction.icp} + ${direction.offer}`,
        thesis: [
          `${direction.problem} is painful enough that ${direction.icp} will pay`,
          `${direction.channel} is effective for reaching this ICP`,
          `Price point of ${direction.price} captures value without pricing out`,
        ],
        topAssumptions: [
          {
            assumption: `${direction.icp} have budget authority`,
            rung: 'intent',
            cheapestTest: 'Ask 10 prospects in discovery calls',
            estimatedCost: '3h',
          },
          {
            assumption: `${direction.problem} occurs frequently (weekly+)`,
            rung: 'attention',
            cheapestTest: 'Survey pain frequency in cold outreach',
            estimatedCost: '2h + 20 sends',
          },
          {
            assumption: `${direction.price} pricing is acceptable`,
            rung: 'commitment',
            cheapestTest: 'Show pricing in demo, track objections',
            estimatedCost: '5h + 10 demos',
          },
        ],
        nextExperiment: {
          title: 'B2B SaaS for invoice follow-ups',
          passCriteria: '10+ demo requests from 50 sends (20% conversion)',
          cost: '4h + 50 sends',
        },
        killCriteria: direction.killCriteria,
      });
    }
    const res = await fetch(`${this.baseURL}/directions/${directionId}/vc-memo`);
    return res.json();
  }

  // Daily Packet (for In-Tools variant)
  async getDailyPacket(ventureId: string): Promise<DailyPacket> {
    if (this.useMock) {
      const activeExperiment = await this.getActiveExperiment(ventureId);
      const nextExperiment = await this.getNextExperiment(ventureId);

      return Promise.resolve({
        ventureId,
        date: new Date().toISOString(),
        topDecision: {
          title: 'Fund Direction B: Local Services',
          grade: 2,
          speedMode: 'fast',
          description: 'Review VC Memo Lite and decide whether to allocate budget',
          action: 'Review & Decide',
        },
        nextExperiment: {
          title: nextExperiment?.title || 'No experiments queued',
          gates: nextExperiment?.gates.map((g) => g.description) || [],
          latestSignals: ['3/30 sends completed', '1 demo request received'],
        },
        preparedOutputs: [
          {
            type: 'outreach_copy',
            title: 'Email variant A + B',
            description: 'Pain-focused vs benefit-focused subject lines',
          },
          {
            type: 'icp_shortlist',
            title: '20 target companies',
            description: 'SME finance teams with 10-50 employees',
          },
        ],
      });
    }
    const res = await fetch(`${this.baseURL}/ventures/${ventureId}/daily-packet`);
    return res.json();
  }

  // Run loop tick (trigger NBA-style recommendation)
  async runLoopTick(ventureId: string): Promise<any> {
    if (this.useMock) {
      return Promise.resolve({
        success: true,
        message: 'Loop tick completed',
        recommendations: ['Focus on Direction A', 'Run next experiment'],
      });
    }
    const res = await fetch(`${this.baseURL}/ventures/${ventureId}/loop-tick`, {
      method: 'POST',
    });
    return res.json();
  }
}

// Export singleton
export const apiClient = new DecisionOSAPIClient('/api/v1', true);
