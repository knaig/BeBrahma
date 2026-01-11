import { describe, it, expect } from 'vitest';
import {
  PolicyEngine,
  rungIndex,
  nextRung,
  cheapSignalHint,
  clamp,
  formatCost,
} from '../policy-engine';
import {
  Venture,
  Direction,
  Experiment,
  EvidenceRung,
  PolicyContext,
} from '../types';

const mockVenture: Venture = {
  id: 'v1',
  name: 'Test Venture',
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

const mockDirection: Direction = {
  id: 'd1',
  ventureId: 'v1',
  icp: 'SME finance teams',
  problem: 'Manual follow-up',
  offer: 'Automated nudges',
  channel: 'Email',
  price: '$299/mo',
  status: 'pending',
  currentRung: 'attention',
  confidenceScore: 50,
  expectedValue: 70,
  allocatedHours: 0,
  allocatedSends: 0,
  allocatedSpend: 0,
  killCriteria: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('PolicyEngine - Grade Experiments', () => {
  it('should assign Grade 0 for synthetic experiments with no cost', () => {
    const experiment: Experiment = {
      id: 'e1',
      directionId: 'd1',
      ventureId: 'v1',
      title: 'Desk research',
      hypothesis: 'Test hypothesis',
      approach: 'Test approach',
      status: 'draft',
      targetRung: 'synthetic',
      grade: 0,
      speedMode: 'fast',
      estimatedHours: 0,
      estimatedSends: 0,
      estimatedSpend: 0,
      gates: [],
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const context: PolicyContext = {
      venture: mockVenture,
      direction: mockDirection,
      actionType: 'run_experiment',
    };

    const grade = PolicyEngine.gradeExperiment(experiment, context);
    expect(grade).toBe(0);
  });

  it('should assign Grade 1 for low-cost experiments', () => {
    const experiment: Experiment = {
      id: 'e1',
      directionId: 'd1',
      ventureId: 'v1',
      title: 'Send 10 emails',
      hypothesis: 'Test hypothesis',
      approach: 'Test approach',
      status: 'draft',
      targetRung: 'attention',
      grade: 1,
      speedMode: 'fast',
      estimatedHours: 2,
      estimatedSends: 10,
      estimatedSpend: 0,
      gates: [],
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const context: PolicyContext = {
      venture: mockVenture,
      direction: mockDirection,
      actionType: 'run_experiment',
    };

    const grade = PolicyEngine.gradeExperiment(experiment, context);
    expect(grade).toBe(1);
  });

  it('should assign Grade 2 for medium-cost experiments', () => {
    const experiment: Experiment = {
      id: 'e1',
      directionId: 'd1',
      ventureId: 'v1',
      title: 'Send 50 emails',
      hypothesis: 'Test hypothesis',
      approach: 'Test approach',
      status: 'draft',
      targetRung: 'intent',
      grade: 2,
      speedMode: 'fast',
      estimatedHours: 4,
      estimatedSends: 50,
      estimatedSpend: 100,
      gates: [],
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const context: PolicyContext = {
      venture: mockVenture,
      direction: mockDirection,
      actionType: 'run_experiment',
    };

    const grade = PolicyEngine.gradeExperiment(experiment, context);
    expect(grade).toBe(2);
  });

  it('should assign Grade 3 for high-stakes experiments (commitment rung)', () => {
    const experiment: Experiment = {
      id: 'e1',
      directionId: 'd1',
      ventureId: 'v1',
      title: 'Request payment',
      hypothesis: 'Test hypothesis',
      approach: 'Test approach',
      status: 'draft',
      targetRung: 'commitment',
      grade: 3,
      speedMode: 'slow',
      estimatedHours: 8,
      estimatedSends: 20,
      estimatedSpend: 500,
      gates: [],
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const context: PolicyContext = {
      venture: mockVenture,
      direction: mockDirection,
      actionType: 'run_experiment',
    };

    const grade = PolicyEngine.gradeExperiment(experiment, context);
    expect(grade).toBe(3);
  });

  it('should assign Grade 3 for high-volume outreach', () => {
    const experiment: Experiment = {
      id: 'e1',
      directionId: 'd1',
      ventureId: 'v1',
      title: 'Send 150 emails',
      hypothesis: 'Test hypothesis',
      approach: 'Test approach',
      status: 'draft',
      targetRung: 'attention',
      grade: 3,
      speedMode: 'slow',
      estimatedHours: 4,
      estimatedSends: 150,
      estimatedSpend: 0,
      gates: [],
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const context: PolicyContext = {
      venture: mockVenture,
      direction: mockDirection,
      actionType: 'run_experiment',
    };

    const grade = PolicyEngine.gradeExperiment(experiment, context);
    expect(grade).toBe(3);
  });
});

describe('PolicyEngine - Speed Mode', () => {
  it('should default to fast for Grade 0-1', () => {
    const context: PolicyContext = {
      venture: mockVenture,
      direction: mockDirection,
      actionType: 'run_experiment',
    };

    const speedMode0 = PolicyEngine.determineSpeedMode(0, context);
    const speedMode1 = PolicyEngine.determineSpeedMode(1, context);

    expect(speedMode0).toBe('fast');
    expect(speedMode1).toBe('fast');
  });

  it('should enforce slow mode for sprinter profile on Grade 2+', () => {
    const sprinterVenture: Venture = {
      ...mockVenture,
      founderProfile: 'sprinter',
    };

    const context: PolicyContext = {
      venture: sprinterVenture,
      direction: mockDirection,
      actionType: 'run_experiment',
    };

    const speedMode2 = PolicyEngine.determineSpeedMode(2, context);
    const speedMode3 = PolicyEngine.determineSpeedMode(3, context);

    expect(speedMode2).toBe('slow');
    expect(speedMode3).toBe('slow');
  });
});

describe('PolicyEngine - WIP Limits', () => {
  it('should allow funding when under WIP limits', () => {
    const result = PolicyEngine.validateWIPLimits(2, 1, {
      venture: mockVenture,
      actionType: 'fund',
    });

    expect(result.valid).toBe(true);
  });

  it('should block funding when at max directions', () => {
    const result = PolicyEngine.validateWIPLimits(3, 1, {
      venture: mockVenture,
      actionType: 'fund',
    });

    expect(result.valid).toBe(false);
    expect(result.message).toContain('Cannot fund more than 3 directions');
  });

  it('should block running when at max experiments', () => {
    const result = PolicyEngine.validateWIPLimits(2, 1, {
      venture: mockVenture,
      actionType: 'run_experiment',
    });

    expect(result.valid).toBe(true);

    const resultAtLimit = PolicyEngine.validateWIPLimits(2, 2, {
      venture: mockVenture,
      actionType: 'run_experiment',
    });

    expect(resultAtLimit.valid).toBe(false);
    expect(resultAtLimit.message).toContain('Cannot run more than 1 experiments');
  });
});

describe('PolicyEngine - Soft Friction', () => {
  it('should require soft friction for Grade 3 actions', () => {
    const mockExperiment: Experiment = {
      id: 'e1',
      directionId: 'd1',
      ventureId: 'v1',
      title: 'High-stakes experiment',
      hypothesis: 'Test',
      approach: 'Test',
      status: 'draft',
      targetRung: 'commitment',
      grade: 3,
      speedMode: 'slow',
      estimatedHours: 10,
      estimatedSends: 100,
      estimatedSpend: 1000,
      gates: [],
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const policy = PolicyEngine.evaluateAction('run_experiment', 3, 'slow', {
      venture: mockVenture,
      direction: mockDirection,
      experiment: mockExperiment,
      actionType: 'run_experiment',
    });

    expect(policy.friction).toBe('soft');
    expect(policy.requiresSlowMode).toBe(true);
    expect(policy.requiresApproval).toBe(true);
    expect(policy.recommendations).toBeDefined();
    expect(policy.recommendations!.length).toBeGreaterThan(0);
  });

  it('should not require override reason for Grade 0-1', () => {
    const policy0 = PolicyEngine.evaluateAction('run_experiment', 0, 'fast', {
      venture: mockVenture,
      actionType: 'run_experiment',
    });

    const policy1 = PolicyEngine.evaluateAction('run_experiment', 1, 'fast', {
      venture: mockVenture,
      actionType: 'run_experiment',
    });

    expect(policy0.friction).toBe('none');
    expect(policy1.friction).toBe('none');
  });
});

describe('Helper functions', () => {
  it('rungIndex should return correct indices', () => {
    expect(rungIndex('synthetic')).toBe(0);
    expect(rungIndex('attention')).toBe(1);
    expect(rungIndex('intent')).toBe(2);
    expect(rungIndex('commitment')).toBe(3);
    expect(rungIndex('retention')).toBe(4);
  });

  it('nextRung should return next rung or null at end', () => {
    expect(nextRung('synthetic')).toBe('attention');
    expect(nextRung('attention')).toBe('intent');
    expect(nextRung('intent')).toBe('commitment');
    expect(nextRung('commitment')).toBe('retention');
    expect(nextRung('retention')).toBe(null);
  });

  it('cheapSignalHint should return appropriate hints', () => {
    expect(cheapSignalHint('synthetic')).toContain('LLM');
    expect(cheapSignalHint('attention')).toContain('email');
    expect(cheapSignalHint('intent')).toContain('call');
    expect(cheapSignalHint('commitment')).toContain('pilot');
    expect(cheapSignalHint('retention')).toContain('usage');
  });

  it('clamp should constrain values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('formatCost should format costs correctly', () => {
    expect(formatCost(0, 0, 0)).toBe('Free');
    expect(formatCost(2, 0, 0)).toBe('2h');
    expect(formatCost(0, 30, 0)).toBe('30 sends');
    expect(formatCost(0, 0, 100)).toBe('$100');
    expect(formatCost(4, 50, 200)).toBe('4h + 50 sends + $200');
  });
});
