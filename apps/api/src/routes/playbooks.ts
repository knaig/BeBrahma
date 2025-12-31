import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createPlaybookSchema = z.object({
  workspaceSlug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  goal: z.string().min(1),
  phases: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      order: z.number().int().min(0),
      estimatedDuration: z.string().optional(),
      gates: z.array(
        z.object({
          name: z.string().min(1),
          type: z.enum(['APPROVAL', 'METRIC', 'CHECKLIST', 'DECISION']),
          criteria: z.string(),
          order: z.number().int().min(0),
        })
      ).optional(),
    })
  ),
});

const startPlaybookSchema = z.object({
  playbookId: z.string().min(1),
  workspaceSlug: z.string().min(1),
});

const completePhaseSchema = z.object({
  phaseId: z.string().min(1),
  gateResults: z.record(z.string(), z.boolean()),
  notes: z.string().optional(),
});

// Create a new playbook template
router.post('/playbooks', requireAuth, async (req, res) => {
  try {
    const validation = createPlaybookSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { workspaceSlug, name, description, goal, phases } = validation.data;
    const userId = req.user.id;

    // Find workspace
    const workspace = await prisma.workspace.findFirst({
      where: { slug: workspaceSlug, userId },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found',
      });
    }

    // Create playbook with phases and gates
    const playbook = await prisma.playbook.create({
      data: {
        workspaceId: workspace.id,
        name,
        description,
        goal,
        status: 'DRAFT',
        phases: {
          create: phases.map((phase) => ({
            name: phase.name,
            description: phase.description,
            order: phase.order,
            estimatedDuration: phase.estimatedDuration,
            status: 'PENDING',
            gates: {
              create: phase.gates?.map((gate) => ({
                name: gate.name,
                type: gate.type,
                criteria: gate.criteria,
                order: gate.order,
                status: 'PENDING',
              })) || [],
            },
          })),
        },
      },
      include: {
        phases: {
          include: {
            gates: true,
          },
          orderBy: { order: 'asc' },
        },
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: playbook,
    });
  } catch (error) {
    console.error('Create playbook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create playbook',
    });
  }
});

// List all playbooks
router.get('/playbooks', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceSlug, status } = req.query;

    const where: any = {
      workspace: { userId },
    };

    if (workspaceSlug) {
      where.workspace.slug = workspaceSlug;
    }

    if (status) {
      where.status = status;
    }

    const playbooks = await prisma.playbook.findMany({
      where,
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        phases: {
          include: {
            gates: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: playbooks,
    });
  } catch (error) {
    console.error('List playbooks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list playbooks',
    });
  }
});

// Get playbook by ID
router.get('/playbooks/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const playbook = await prisma.playbook.findFirst({
      where: {
        id,
        workspace: { userId },
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        phases: {
          include: {
            gates: true,
            tasks: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!playbook) {
      return res.status(404).json({
        success: false,
        error: 'Playbook not found',
      });
    }

    // Calculate progress
    const totalPhases = playbook.phases.length;
    const completedPhases = playbook.phases.filter((p) => p.status === 'COMPLETED').length;
    const progress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

    res.json({
      success: true,
      data: {
        ...playbook,
        progress,
        stats: {
          totalPhases,
          completedPhases,
          currentPhase: playbook.phases.find((p) => p.status === 'IN_PROGRESS')?.name,
        },
      },
    });
  } catch (error) {
    console.error('Get playbook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get playbook',
    });
  }
});

// Start a playbook (activate it)
router.post('/playbooks/:id/start', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const playbook = await prisma.playbook.findFirst({
      where: {
        id,
        workspace: { userId },
      },
      include: {
        phases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!playbook) {
      return res.status(404).json({
        success: false,
        error: 'Playbook not found',
      });
    }

    if (playbook.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Playbook is already active or completed',
      });
    }

    // Start playbook and activate first phase
    const firstPhase = playbook.phases[0];

    await prisma.$transaction([
      prisma.playbook.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      }),
      prisma.phase.update({
        where: { id: firstPhase.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      }),
    ]);

    const updatedPlaybook = await prisma.playbook.findUnique({
      where: { id },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        phases: {
          include: {
            gates: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: updatedPlaybook,
    });
  } catch (error) {
    console.error('Start playbook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start playbook',
    });
  }
});

// Complete a phase
router.post('/playbooks/phases/:phaseId/complete', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { phaseId } = req.params;
    const validation = completePhaseSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
    }

    const { gateResults, notes } = validation.data;

    const phase = await prisma.phase.findFirst({
      where: {
        id: phaseId,
        playbook: {
          workspace: { userId },
        },
      },
      include: {
        gates: true,
        playbook: {
          include: {
            phases: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!phase) {
      return res.status(404).json({
        success: false,
        error: 'Phase not found',
      });
    }

    // Check if all gates passed
    const allGatesPassed = Object.values(gateResults).every((result) => result === true);

    if (!allGatesPassed) {
      return res.status(400).json({
        success: false,
        error: 'All gates must pass to complete phase',
        failedGates: Object.entries(gateResults)
          .filter(([_, passed]) => !passed)
          .map(([gateId]) => gateId),
      });
    }

    // Update gates status
    await Promise.all(
      Object.entries(gateResults).map(([gateId, passed]) =>
        prisma.gate.update({
          where: { id: gateId },
          data: {
            status: passed ? 'PASSED' : 'FAILED',
          },
        })
      )
    );

    // Complete current phase
    await prisma.phase.update({
      where: { id: phaseId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completionNotes: notes,
      },
    });

    // Find next phase
    const currentPhaseIndex = phase.playbook.phases.findIndex((p) => p.id === phaseId);
    const nextPhase = phase.playbook.phases[currentPhaseIndex + 1];

    if (nextPhase) {
      // Activate next phase
      await prisma.phase.update({
        where: { id: nextPhase.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    } else {
      // No more phases, complete playbook
      await prisma.playbook.update({
        where: { id: phase.playbookId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    // Return updated playbook
    const updatedPlaybook = await prisma.playbook.findUnique({
      where: { id: phase.playbookId },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        phases: {
          include: {
            gates: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: updatedPlaybook,
    });
  } catch (error) {
    console.error('Complete phase error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete phase',
    });
  }
});

// Update gate status (for manual approval/checklist)
router.patch('/playbooks/gates/:gateId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { gateId } = req.params;
    const { status, notes } = req.body;

    const gate = await prisma.gate.findFirst({
      where: {
        id: gateId,
        phase: {
          playbook: {
            workspace: { userId },
          },
        },
      },
    });

    if (!gate) {
      return res.status(404).json({
        success: false,
        error: 'Gate not found',
      });
    }

    const updatedGate = await prisma.gate.update({
      where: { id: gateId },
      data: {
        status,
        notes,
      },
    });

    res.json({
      success: true,
      data: updatedGate,
    });
  } catch (error) {
    console.error('Update gate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update gate',
    });
  }
});

export default router;
