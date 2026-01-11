// Policy Engine - Decision Grades + Soft Friction

import {
  DecisionGrade,
  SpeedMode,
  PolicyResult,
  PolicyContext,
  EvidenceRung,
  FounderProfile,
  Experiment,
} from './types';

export class PolicyEngine {
  /**
   * Determine decision grade for an experiment based on impact and cost
   */
  static gradeExperiment(experiment: Experiment, context: PolicyContext): DecisionGrade {
    const { estimatedHours, estimatedSends, estimatedSpend, targetRung } = experiment;
    const { venture } = context;

    // Grade 0: Auto-run outputs (no resources, synthetic data)
    if (
      estimatedHours === 0 &&
      estimatedSends === 0 &&
      estimatedSpend === 0 &&
      targetRung === 'synthetic'
    ) {
      return 0;
    }

    // Grade 3: High-stakes decisions
    if (
      targetRung === 'commitment' || // Asking for money
      estimatedSends >= 100 ||        // High volume outreach
      estimatedSpend >= 500 ||        // Meaningful spend
      this.isPublicClaim(experiment) || // Reputation-sensitive
      this.isRungEscalation(context.direction?.currentRung, targetRung)
    ) {
      return 3;
    }

    // Grade 2: Requires explicit decision
    if (
      estimatedHours >= 4 ||
      estimatedSends >= 20 ||
      estimatedSpend >= 100 ||
      targetRung === 'intent'
    ) {
      return 2;
    }

    // Grade 1: One-tap approval
    return 1;
  }

  /**
   * Determine speed mode (fast vs slow)
   */
  static determineSpeedMode(
    grade: DecisionGrade,
    context: PolicyContext
  ): SpeedMode {
    const { venture, direction, experiment } = context;

    // Default FAST for Grades 0-1
    if (grade <= 1) {
      return 'fast';
    }

    // Sprinter profile: more SLOW enforcement
    if (venture.founderProfile === 'sprinter' && grade >= 2) {
      return 'slow';
    }

    // Perfectionist profile: enforce FAST on Grade 0-1 (force shipping)
    if (venture.founderProfile === 'perfectionist' && grade <= 1) {
      return 'fast';
    }

    // Default SLOW when:
    // - Escalating Intent -> Commitment
    if (
      this.isRungEscalation(direction?.currentRung, experiment?.targetRung) &&
      experiment?.targetRung === 'commitment'
    ) {
      return 'slow';
    }

    // - Public claims / high-volume outreach
    if (experiment && (this.isPublicClaim(experiment) || experiment.estimatedSends >= 100)) {
      return 'slow';
    }

    // - Meaningful spend
    if (experiment && experiment.estimatedSpend >= 500) {
      return 'slow';
    }

    // Default based on grade
    return grade >= 3 ? 'slow' : 'fast';
  }

  /**
   * Evaluate policy for an action
   */
  static evaluateAction(
    actionType: string,
    grade: DecisionGrade,
    speedMode: SpeedMode,
    context: PolicyContext
  ): PolicyResult {
    const { venture } = context;

    // Grade 0: Always allowed, no friction
    if (grade === 0) {
      return {
        allowed: true,
        requiresSlowMode: false,
        requiresApproval: false,
        friction: 'none',
      };
    }

    // Grade 1: One-tap approval
    if (grade === 1) {
      return {
        allowed: true,
        requiresSlowMode: false,
        requiresApproval: true,
        friction: 'none',
        message: 'Tap to approve',
      };
    }

    // Grade 2: Explicit decision required
    if (grade === 2) {
      return {
        allowed: true,
        requiresSlowMode: speedMode === 'slow',
        requiresApproval: true,
        friction: 'soft',
        message: 'Review VC Memo Lite before proceeding',
        recommendations: [
          'Review assumption ledger',
          'Check kill criteria',
          'Verify budget allocation',
        ],
      };
    }

    // Grade 3: Slow mode by default, soft friction modal
    if (grade === 3) {
      const shouldBlock = speedMode === 'fast' && venture.founderProfile === 'sprinter';

      return {
        allowed: !shouldBlock,
        requiresSlowMode: true,
        requiresApproval: true,
        friction: 'soft',
        message: shouldBlock
          ? 'High-stakes decision blocked. Switch to slow mode.'
          : 'Recommended: slow mode review',
        recommendations: [
          'Run pre-mortem: what could go wrong?',
          'Define downside plan',
          'Get second opinion',
          'Sleep on it (24hr rule)',
        ],
      };
    }

    return {
      allowed: false,
      requiresSlowMode: false,
      requiresApproval: false,
      friction: 'hard',
      message: 'Action not allowed',
    };
  }

  /**
   * Check if this is rung escalation (requires extra caution)
   */
  private static isRungEscalation(
    currentRung: EvidenceRung | undefined,
    targetRung: EvidenceRung | undefined
  ): boolean {
    if (!currentRung || !targetRung) return false;

    const rungOrder: EvidenceRung[] = [
      'synthetic',
      'attention',
      'intent',
      'commitment',
      'retention',
    ];

    const currentIndex = rungOrder.indexOf(currentRung);
    const targetIndex = rungOrder.indexOf(targetRung);

    // Escalating Intent -> Commitment is the critical threshold
    return (
      currentIndex === rungOrder.indexOf('intent') &&
      targetIndex === rungOrder.indexOf('commitment')
    );
  }

  /**
   * Check if experiment involves public claims (reputation-sensitive)
   */
  private static isPublicClaim(experiment: Experiment): boolean {
    const publicKeywords = [
      'landing page',
      'blog post',
      'social media',
      'press release',
      'public launch',
      'product hunt',
    ];

    const text = `${experiment.title} ${experiment.hypothesis} ${experiment.approach}`.toLowerCase();

    return publicKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Get founder profile defaults
   */
  static getProfileDefaults(profile: FounderProfile): {
    maxDirections: number;
    maxActiveExperiments: number;
    slowModeThreshold: DecisionGrade;
  } {
    switch (profile) {
      case 'sprinter':
        return {
          maxDirections: 2,
          maxActiveExperiments: 1,
          slowModeThreshold: 2, // More strict
        };
      case 'perfectionist':
        return {
          maxDirections: 3,
          maxActiveExperiments: 2,
          slowModeThreshold: 3, // Force shipping on lower grades
        };
      case 'balanced':
      default:
        return {
          maxDirections: 3,
          maxActiveExperiments: 1,
          slowModeThreshold: 3,
        };
    }
  }

  /**
   * Validate WIP limits
   */
  static validateWIPLimits(
    fundedDirections: number,
    activeExperiments: number,
    context: PolicyContext
  ): { valid: boolean; message?: string } {
    const { venture } = context;
    const { maxDirections, maxActiveExperiments } = venture.wipLimits;

    if (fundedDirections > maxDirections) {
      return {
        valid: false,
        message: `Cannot fund more than ${maxDirections} directions. Defund one first.`,
      };
    }

    if (activeExperiments > maxActiveExperiments) {
      return {
        valid: false,
        message: `Cannot run more than ${maxActiveExperiments} experiments. Complete one first.`,
      };
    }

    return { valid: true };
  }
}

// Helper functions

export function rungIndex(rung: EvidenceRung): number {
  const order: EvidenceRung[] = ['synthetic', 'attention', 'intent', 'commitment', 'retention'];
  return order.indexOf(rung);
}

export function nextRung(current: EvidenceRung): EvidenceRung | null {
  const order: EvidenceRung[] = ['synthetic', 'attention', 'intent', 'commitment', 'retention'];
  const index = order.indexOf(current);
  return index < order.length - 1 ? order[index + 1] : null;
}

export function cheapSignalHint(targetRung: EvidenceRung): string {
  switch (targetRung) {
    case 'synthetic':
      return 'Run LLM simulation or desk research';
    case 'attention':
      return 'Send 10 cold emails, track opens/clicks';
    case 'intent':
      return 'Ask for 15min call or demo request';
    case 'commitment':
      return 'Offer pilot/beta at discounted price';
    case 'retention':
      return 'Track usage after 30/60/90 days';
    default:
      return 'Define next validation step';
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatCost(hours: number, sends: number, spend: number): string {
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (sends > 0) parts.push(`${sends} sends`);
  if (spend > 0) parts.push(`$${spend}`);
  return parts.join(' + ') || 'Free';
}
