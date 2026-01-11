import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// VENTURE ENDPOINTS
// ============================================================================

// GET /api/v1/ventures/:id
router.get('/ventures/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const venture = await prisma.venture.findUnique({
      where: { id },
      include: {
        directions: true,
        experiments: true,
        integrations: true,
      },
    });

    if (!venture) {
      return res.status(404).json({ error: 'Venture not found' });
    }

    res.json(venture);
  } catch (error) {
    console.error('Error fetching venture:', error);
    res.status(500).json({ error: 'Failed to fetch venture' });
  }
});

// POST /api/v1/ventures
router.post('/ventures', async (req, res) => {
  try {
    const { userId, name, ...data } = req.body;

    const venture = await prisma.venture.create({
      data: {
        userId,
        name,
        ...data,
      },
    });

    res.status(201).json(venture);
  } catch (error) {
    console.error('Error creating venture:', error);
    res.status(500).json({ error: 'Failed to create venture' });
  }
});

// PATCH /api/v1/ventures/:id
router.patch('/ventures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const venture = await prisma.venture.update({
      where: { id },
      data: updates,
    });

    res.json(venture);
  } catch (error) {
    console.error('Error updating venture:', error);
    res.status(500).json({ error: 'Failed to update venture' });
  }
});

// ============================================================================
// DIRECTION ENDPOINTS
// ============================================================================

// GET /api/v1/ventures/:ventureId/directions
router.get('/ventures/:ventureId/directions', async (req, res) => {
  try {
    const { ventureId } = req.params;

    const directions = await prisma.direction.findMany({
      where: { ventureId },
      include: {
        experiments: true,
        evidence: true,
      },
      orderBy: { expectedValue: 'desc' },
    });

    res.json(directions);
  } catch (error) {
    console.error('Error fetching directions:', error);
    res.status(500).json({ error: 'Failed to fetch directions' });
  }
});

// POST /api/v1/directions
router.post('/directions', async (req, res) => {
  try {
    const direction = await prisma.direction.create({
      data: req.body,
    });

    res.status(201).json(direction);
  } catch (error) {
    console.error('Error creating direction:', error);
    res.status(500).json({ error: 'Failed to create direction' });
  }
});

// PATCH /api/v1/directions/:id
router.patch('/directions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const direction = await prisma.direction.update({
      where: { id },
      data: updates,
    });

    res.json(direction);
  } catch (error) {
    console.error('Error updating direction:', error);
    res.status(500).json({ error: 'Failed to update direction' });
  }
});

// GET /api/v1/directions/:id/vc-memo
router.get('/directions/:id/vc-memo', async (req, res) => {
  try {
    const { id } = req.params;

    const direction = await prisma.direction.findUnique({
      where: { id },
      include: {
        experiments: {
          where: { status: 'QUEUED' },
          orderBy: { grade: 'asc' },
          take: 1,
        },
      },
    });

    if (!direction) {
      return res.status(404).json({ error: 'Direction not found' });
    }

    // Generate VC Memo Lite
    const vcMemo = {
      directionId: direction.id,
      headline: `${direction.icp} + ${direction.offer}`,
      thesis: [
        `${direction.problem} is painful enough that ${direction.icp} will pay`,
        `${direction.channel} is effective for reaching this ICP`,
        `Price point of ${direction.price} captures value without pricing out`,
      ],
      topAssumptions: [
        {
          assumption: `${direction.icp} have budget authority`,
          rung: 'INTENT',
          cheapestTest: 'Ask 10 prospects in discovery calls',
          estimatedCost: '3h',
        },
        {
          assumption: `${direction.problem} occurs frequently (weekly+)`,
          rung: 'ATTENTION',
          cheapestTest: 'Survey pain frequency in cold outreach',
          estimatedCost: '2h + 20 sends',
        },
        {
          assumption: `${direction.price} pricing is acceptable`,
          rung: 'COMMITMENT',
          cheapestTest: 'Show pricing in demo, track objections',
          estimatedCost: '5h + 10 demos',
        },
      ],
      nextExperiment: direction.experiments[0]
        ? {
            title: direction.experiments[0].title,
            passCriteria: 'See experiment gates',
            cost: `${direction.experiments[0].estimatedHours}h + ${direction.experiments[0].estimatedSends} sends + $${direction.experiments[0].estimatedSpend}`,
          }
        : null,
      killCriteria: direction.killCriteria,
    };

    res.json(vcMemo);
  } catch (error) {
    console.error('Error generating VC memo:', error);
    res.status(500).json({ error: 'Failed to generate VC memo' });
  }
});

// ============================================================================
// EXPERIMENT ENDPOINTS
// ============================================================================

// GET /api/v1/experiments
router.get('/experiments', async (req, res) => {
  try {
    const { directionId, status } = req.query;

    const where: any = {};
    if (directionId) where.directionId = directionId;
    if (status) where.status = status;

    const experiments = await prisma.decisionExperiment.findMany({
      where,
      include: {
        gates: true,
        evidence: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(experiments);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

// POST /api/v1/experiments
router.post('/experiments', async (req, res) => {
  try {
    const { gates, ...experimentData } = req.body;

    const experiment = await prisma.decisionExperiment.create({
      data: {
        ...experimentData,
        gates: gates
          ? {
              create: gates.map((gate: any, index: number) => ({
                ...gate,
                order: index + 1,
              })),
            }
          : undefined,
      },
      include: {
        gates: true,
      },
    });

    res.status(201).json(experiment);
  } catch (error) {
    console.error('Error creating experiment:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// PATCH /api/v1/experiments/:id
router.patch('/experiments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const experiment = await prisma.decisionExperiment.update({
      where: { id },
      data: updates,
      include: {
        gates: true,
      },
    });

    res.json(experiment);
  } catch (error) {
    console.error('Error updating experiment:', error);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

// POST /api/v1/experiments/:id/evaluate
router.post('/experiments/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await prisma.decisionExperiment.findUnique({
      where: { id },
      include: {
        gates: { orderBy: { order: 'asc' } },
        evidence: true,
      },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Evaluate gates sequentially
    const gateResults = [];
    let allPassed = true;

    for (const gate of experiment.gates) {
      const result = await evaluateGate(gate, experiment.evidence);
      gateResults.push(result);

      await prisma.experimentGate.update({
        where: { id: gate.id },
        data: {
          status: result.passed ? 'passed' : 'failed',
          evaluatedAt: new Date(),
          evaluationResult: result,
        },
      });

      if (!result.passed) {
        allPassed = false;
        break; // Stop at first failure
      }
    }

    res.json({
      passed: allPassed,
      gateResults,
    });
  } catch (error) {
    console.error('Error evaluating experiment:', error);
    res.status(500).json({ error: 'Failed to evaluate experiment' });
  }
});

// Helper function to evaluate gates
async function evaluateGate(gate: any, evidence: any[]): Promise<any> {
  switch (gate.type) {
    case 'EVIDENCE_THRESHOLD':
      const count = evidence.length;
      const threshold = gate.condition.threshold || 0;
      return {
        passed: count >= threshold,
        reason: `Evidence count: ${count}/${threshold}`,
      };

    case 'METRIC_THRESHOLD':
      // TODO: Implement metric evaluation
      return { passed: false, reason: 'Metric threshold not implemented' };

    case 'ARTIFACT_REQUIRED':
      // TODO: Check for artifact existence
      return { passed: false, reason: 'Artifact check not implemented' };

    case 'MANUAL_APPROVAL':
      return { passed: gate.status === 'passed', reason: 'Manual approval required' };

    default:
      return { passed: false, reason: 'Unknown gate type' };
  }
}

// ============================================================================
// EVIDENCE ENDPOINTS
// ============================================================================

// POST /api/v1/evidence
router.post('/evidence', async (req, res) => {
  try {
    const evidence = await prisma.decisionEvidence.create({
      data: req.body,
    });

    res.status(201).json(evidence);
  } catch (error) {
    console.error('Error creating evidence:', error);
    res.status(500).json({ error: 'Failed to create evidence' });
  }
});

// GET /api/v1/evidence
router.get('/evidence', async (req, res) => {
  try {
    const { ventureId, directionId, experimentId } = req.query;

    const where: any = {};
    if (ventureId) where.ventureId = ventureId;
    if (directionId) where.directionId = directionId;
    if (experimentId) where.experimentId = experimentId;

    const evidence = await prisma.decisionEvidence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// ============================================================================
// DECISION EVENTS
// ============================================================================

// POST /api/v1/decisions
router.post('/decisions', async (req, res) => {
  try {
    const decision = await prisma.decisionEvent.create({
      data: req.body,
    });

    res.status(201).json(decision);
  } catch (error) {
    console.error('Error creating decision:', error);
    res.status(500).json({ error: 'Failed to create decision' });
  }
});

// GET /api/v1/decisions
router.get('/decisions', async (req, res) => {
  try {
    const { ventureId, directionId } = req.query;

    const where: any = {};
    if (ventureId) where.ventureId = ventureId;
    if (directionId) where.directionId = directionId;

    const decisions = await prisma.decisionEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(decisions);
  } catch (error) {
    console.error('Error fetching decisions:', error);
    res.status(500).json({ error: 'Failed to fetch decisions' });
  }
});

// ============================================================================
// OVERRIDE EVENTS
// ============================================================================

// POST /api/v1/overrides
router.post('/overrides', async (req, res) => {
  try {
    const override = await prisma.overrideEvent.create({
      data: req.body,
    });

    res.status(201).json(override);
  } catch (error) {
    console.error('Error creating override:', error);
    res.status(500).json({ error: 'Failed to create override' });
  }
});

// ============================================================================
// LOOP TICK
// ============================================================================

// POST /api/v1/ventures/:id/loop-tick
router.post('/ventures/:id/loop-tick', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Implement NBA-style recommendation logic
    // For now, return a simple success response

    res.json({
      success: true,
      message: 'Loop tick completed',
      recommendations: ['Focus on highest EV direction', 'Run next queued experiment'],
    });
  } catch (error) {
    console.error('Error running loop tick:', error);
    res.status(500).json({ error: 'Failed to run loop tick' });
  }
});

// ============================================================================
// DAILY PACKET (for In-Tools variant)
// ============================================================================

// GET /api/v1/ventures/:id/daily-packet
router.get('/ventures/:id/daily-packet', async (req, res) => {
  try {
    const { id } = req.params;

    const venture = await prisma.venture.findUnique({
      where: { id },
      include: {
        directions: { where: { status: 'PENDING' }, take: 1 },
        experiments: { where: { status: 'RUNNING' }, take: 1 },
      },
    });

    if (!venture) {
      return res.status(404).json({ error: 'Venture not found' });
    }

    const packet = {
      ventureId: venture.id,
      date: new Date().toISOString(),
      topDecision: venture.directions[0]
        ? {
            title: `Fund Direction: ${venture.directions[0].icp}`,
            grade: 2,
            speedMode: 'FAST',
            description: 'Review VC Memo Lite and decide whether to allocate budget',
            action: 'Review & Decide',
          }
        : null,
      nextExperiment: venture.experiments[0]
        ? {
            title: venture.experiments[0].title,
            gates: [], // TODO: Fetch gates
            latestSignals: [], // TODO: Fetch recent evidence
          }
        : null,
      preparedOutputs: [
        {
          type: 'outreach_copy',
          title: 'Email variant A + B',
          description: 'Pain-focused vs benefit-focused subject lines',
        },
      ],
    };

    res.json(packet);
  } catch (error) {
    console.error('Error generating daily packet:', error);
    res.status(500).json({ error: 'Failed to generate daily packet' });
  }
});

export default router;