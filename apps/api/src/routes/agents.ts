import express from 'express';
import { PrismaClient, AgentStatus } from '@prisma/client';
import { broadcastAgentStatus } from '../websocket/index.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware for basic authentication (in production, use Clerk middleware)
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // In production, verify Clerk JWT token here
  const userId = req.headers['user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  (req as any).userId = userId;
  next();
};

// GET /api/agents/session/:sessionId - Get all agents for a session
router.get('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get all agent sessions for this session
    const agentSessions = await prisma.agentSession.findMany({
      where: { sessionId },
      include: {
        agent: true
      }
    });

    // If no agents exist for this session, create default agent sessions
    if (agentSessions.length === 0) {
      // Get all available agent personas
      const allPersonas = await prisma.agentPersona.findMany();
      
      // If no personas exist, create default ones
      if (allPersonas.length === 0) {
        await createDefaultAgentPersonas();
        const newPersonas = await prisma.agentPersona.findMany();
        
        // Create sessions for all personas
        const sessionPromises = newPersonas.map(persona =>
          prisma.agentSession.create({
            data: {
              sessionId,
              agentId: persona.id,
              currentStatus: persona.defaultStatus
            },
            include: {
              agent: true
            }
          })
        );
        
        const newSessions = await Promise.all(sessionPromises);
        return res.json({
          success: true,
          agents: newSessions.map(session => ({
            id: session.id,
            sessionId: session.sessionId,
            agentId: session.agentId,
            currentStatus: session.currentStatus,
            lastActivity: session.lastActivity,
            metadata: session.metadata,
            persona: session.agent
          }))
        });
      } else {
        // Create sessions for existing personas
        const sessionPromises = allPersonas.map(persona =>
          prisma.agentSession.create({
            data: {
              sessionId,
              agentId: persona.id,
              currentStatus: persona.defaultStatus
            },
            include: {
              agent: true
            }
          })
        );
        
        const newSessions = await Promise.all(sessionPromises);
        return res.json({
          success: true,
          agents: newSessions.map(session => ({
            id: session.id,
            sessionId: session.sessionId,
            agentId: session.agentId,
            currentStatus: session.currentStatus,
            lastActivity: session.lastActivity,
            metadata: session.metadata,
            persona: session.agent
          }))
        });
      }
    }

    // Return existing agent sessions
    res.json({
      success: true,
      agents: agentSessions.map(session => ({
        id: session.id,
        sessionId: session.sessionId,
        agentId: session.agentId,
        currentStatus: session.currentStatus,
        lastActivity: session.lastActivity,
        metadata: session.metadata,
        persona: session.agent
      }))
    });
    
  } catch (error) {
    console.error('Error fetching agents for session:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// POST /api/agents/session/:sessionId/status - Update agent status
router.post('/session/:sessionId/status', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agentId, status, metadata } = req.body;
    
    if (!agentId || !status) {
      return res.status(400).json({ error: 'Agent ID and status are required' });
    }
    
    if (!Object.values(AgentStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Update agent session status
    const updatedSession = await prisma.agentSession.update({
      where: {
        sessionId_agentId: {
          sessionId,
          agentId
        }
      },
      data: {
        currentStatus: status,
        lastActivity: new Date(),
        metadata: metadata || undefined
      },
      include: {
        agent: true
      }
    });
    
    // Broadcast status update via WebSocket
    broadcastAgentStatus(sessionId, agentId, status, {
      ...metadata,
      persona: updatedSession.agent
    });
    
    res.json({
      success: true,
      agent: {
        id: updatedSession.id,
        sessionId: updatedSession.sessionId,
        agentId: updatedSession.agentId,
        currentStatus: updatedSession.currentStatus,
        lastActivity: updatedSession.lastActivity,
        metadata: updatedSession.metadata,
        persona: updatedSession.agent
      }
    });
    
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ error: 'Failed to update agent status' });
  }
});

// GET /api/agents/personas - Get all available agent personas
router.get('/personas', requireAuth, async (req, res) => {
  try {
    const personas = await prisma.agentPersona.findMany({
      orderBy: { role: 'asc' }
    });
    
    // If no personas exist, create defaults
    if (personas.length === 0) {
      await createDefaultAgentPersonas();
      const newPersonas = await prisma.agentPersona.findMany({
        orderBy: { role: 'asc' }
      });
      return res.json({
        success: true,
        personas: newPersonas
      });
    }
    
    res.json({
      success: true,
      personas
    });
    
  } catch (error) {
    console.error('Error fetching agent personas:', error);
    res.status(500).json({ error: 'Failed to fetch agent personas' });
  }
});

// Helper function to create default agent personas
async function createDefaultAgentPersonas() {
  const defaultPersonas = [
    {
      role: 'PM',
      name: 'Alex Chen',
      title: 'Product Manager',
      department: 'Product',
      colorHex: '#10B981',
      speakingStyle: 'Strategic and user-focused. Uses data-driven language and frequently mentions user impact.',
      personalityTraits: {
        formality: 0.7,
        enthusiasm: 0.8,
        analyticalness: 0.9,
        empathy: 0.8,
        directness: 0.7
      }
    },
    {
      role: 'CEO',
      name: 'Sarah Williams',
      title: 'Chief Executive Officer',
      department: 'Executive',
      colorHex: '#8B5CF6',
      speakingStyle: 'Visionary and decisive. Speaks in big picture terms and emphasizes company mission and values.',
      personalityTraits: {
        formality: 0.9,
        enthusiasm: 0.9,
        analyticalness: 0.8,
        empathy: 0.7,
        directness: 0.8
      }
    },
    {
      role: 'CTO',
      name: 'Marcus Johnson',
      title: 'Chief Technology Officer',
      department: 'Engineering',
      colorHex: '#3B82F6',
      speakingStyle: 'Technical and precise. Uses engineering terminology and focuses on scalability and architecture.',
      personalityTraits: {
        formality: 0.8,
        enthusiasm: 0.6,
        analyticalness: 0.9,
        empathy: 0.6,
        directness: 0.9
      }
    },
    {
      role: 'Growth',
      name: 'Emma Rodriguez',
      title: 'Growth Marketing Lead',
      department: 'Marketing',
      colorHex: '#F59E0B',
      speakingStyle: 'Energetic and metrics-driven. Loves talking about conversion rates, growth hacks, and market opportunities.',
      personalityTraits: {
        formality: 0.5,
        enthusiasm: 0.9,
        analyticalness: 0.8,
        empathy: 0.7,
        directness: 0.6
      }
    },
    {
      role: 'Research',
      name: 'Dr. James Kim',
      title: 'Research Director',
      department: 'Research',
      colorHex: '#EC4899',
      speakingStyle: 'Methodical and evidence-based. Quotes studies and emphasizes the importance of validation and testing.',
      personalityTraits: {
        formality: 0.8,
        enthusiasm: 0.6,
        analyticalness: 0.9,
        empathy: 0.7,
        directness: 0.7
      }
    },
    {
      role: 'Data',
      name: 'Priya Patel',
      title: 'Data Scientist',
      department: 'Analytics',
      colorHex: '#06B6D4',
      speakingStyle: 'Analytical and detail-oriented. Speaks in numbers and statistical terms, always backing up points with data.',
      personalityTraits: {
        formality: 0.7,
        enthusiasm: 0.7,
        analyticalness: 0.9,
        empathy: 0.6,
        directness: 0.8
      }
    },
    {
      role: 'Strategy',
      name: 'Michael Thompson',
      title: 'Strategy Consultant',
      department: 'Strategy',
      colorHex: '#DC2626',
      speakingStyle: 'Strategic and framework-oriented. Uses business terminology and thinks in terms of competitive advantage.',
      personalityTraits: {
        formality: 0.8,
        enthusiasm: 0.7,
        analyticalness: 0.9,
        empathy: 0.6,
        directness: 0.8
      }
    },
    {
      role: 'DevOps',
      name: 'Chris Anderson',
      title: 'DevOps Engineer',
      department: 'Engineering',
      colorHex: '#059669',
      speakingStyle: 'Practical and reliability-focused. Talks about infrastructure, automation, and system performance.',
      personalityTraits: {
        formality: 0.6,
        enthusiasm: 0.6,
        analyticalness: 0.8,
        empathy: 0.6,
        directness: 0.9
      }
    }
  ];

  const createPromises = defaultPersonas.map(persona =>
    prisma.agentPersona.create({
      data: {
        role: persona.role as any,
        name: persona.name,
        title: persona.title,
        department: persona.department,
        colorHex: persona.colorHex,
        speakingStyle: persona.speakingStyle,
        personalityTraits: persona.personalityTraits
      }
    })
  );

  await Promise.all(createPromises);
  console.log('Default agent personas created');
}

export default router;