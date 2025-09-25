import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { encrypt, decrypt } from '../utils/encryption';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Input validation schemas
const addApiKeySchema = z.object({
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'AZURE', 'GOOGLE']),
  apiKey: z.string().min(1),
  keyAlias: z.string().optional(),
  metadata: z.object({}).passthrough().optional(),
});

const deleteApiKeySchema = z.object({
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'AZURE', 'GOOGLE']),
});

// Add or update API key
router.post('/llm-keys', requireAuth, rateLimitMiddleware('api-keys'), async (req, res) => {
  try {
    const { provider, apiKey, keyAlias, metadata } = addApiKeySchema.parse(req.body);
    const userId = req.userId!;

    // Encrypt the API key
    const { encryptedData, iv } = encrypt(apiKey, process.env.DB_ENCRYPTION_KEY!);

    // Upsert the API key
    const savedKey = await prisma.apiKey.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      update: {
        encryptedKey: encryptedData,
        iv,
        keyAlias,
        metadata,
        updatedAt: new Date(),
      },
      create: {
        userId,
        provider,
        encryptedKey: encryptedData,
        iv,
        keyAlias,
        metadata,
      },
    });

    res.json({
      id: savedKey.id,
      provider: savedKey.provider,
      keyAlias: savedKey.keyAlias,
      createdAt: savedKey.createdAt,
      updatedAt: savedKey.updatedAt,
    });
  } catch (error) {
    console.error('API key save error:', error);
    res.status(400).json({ error: 'Failed to save API key' });
  }
});

// Get user's configured LLM providers (without exposing actual keys)
router.get('/llm-keys', requireAuth, rateLimitMiddleware('api-keys'), async (req, res) => {
  try {
    const userId = req.userId!;

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        keyAlias: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ apiKeys });
  } catch (error) {
    console.error('API keys fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Test API key validity (without exposing the key)
router.post('/llm-keys/:provider/test', requireAuth, rateLimitMiddleware('api-keys'), async (req, res) => {
  try {
    const provider = req.params.provider as 'OPENAI' | 'ANTHROPIC' | 'AZURE' | 'GOOGLE';
    const userId = req.userId!;

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!apiKeyRecord) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Decrypt the API key for testing
    const decryptedKey = decrypt(apiKeyRecord.encryptedKey, apiKeyRecord.iv, process.env.DB_ENCRYPTION_KEY!);

    // Test the API key based on provider
    let isValid = false;
    let error: string | null = null;

    try {
      switch (provider) {
        case 'OPENAI':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${decryptedKey}`,
              'Content-Type': 'application/json',
            },
          });
          isValid = openaiResponse.ok;
          if (!isValid) error = `OpenAI API returned ${openaiResponse.status}`;
          break;
        
        case 'ANTHROPIC':
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': decryptedKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-sonnet-20240229',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
          });
          isValid = anthropicResponse.ok;
          if (!isValid) error = `Anthropic API returned ${anthropicResponse.status}`;
          break;
        
        default:
          error = 'API testing not implemented for this provider';
      }
    } catch (testError) {
      error = `API test failed: ${testError}`;
    }

    res.json({ valid: isValid, error });
  } catch (error) {
    console.error('API key test error:', error);
    res.status(500).json({ error: 'Failed to test API key' });
  }
});

// Delete API key
router.delete('/llm-keys/:provider', requireAuth, rateLimitMiddleware('api-keys'), async (req, res) => {
  try {
    const provider = req.params.provider as 'OPENAI' | 'ANTHROPIC' | 'AZURE' | 'GOOGLE';
    const userId = req.userId!;

    const deleted = await prisma.apiKey.deleteMany({
      where: {
        userId,
        provider,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('API key delete error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Get user profile with subscription info
router.get('/profile', requireAuth, rateLimitMiddleware('general'), async (req, res) => {
  try {
    const userId = req.userId!;

    // Get subscription info
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        currentPeriodEnd: true,
        provider: true,
        cancelAtPeriodEnd: true,
      },
    });

    // Get API keys count
    const apiKeysCount = await prisma.apiKey.count({
      where: {
        userId,
        isActive: true,
      },
    });

    // Get recent projects count (from ConversationSession)
    const projectsCount = await prisma.conversationSession.count({
      where: { userId },
    });

    res.json({
      subscription,
      apiKeysCount,
      projectsCount,
      limits: {
        maxApiKeys: subscription?.status === 'ACTIVE' ? 10 : 2,
        maxProjects: subscription?.status === 'ACTIVE' ? 100 : 5,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get usage statistics
router.get('/usage', requireAuth, rateLimitMiddleware('general'), async (req, res) => {
  try {
    const userId = req.userId!;
    const { period = '30' } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period as string));

    // Get conversation sessions in period
    const sessions = await prisma.conversationSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: daysAgo,
        },
      },
      select: {
        id: true,
        createdAt: true,
        messages: true,
      },
    });

    // Calculate usage statistics
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((acc, session) => {
      return acc + (Array.isArray(session.messages) ? session.messages.length : 0);
    }, 0);

    // Group by date for chart data
    const dailyUsage = sessions.reduce((acc, session) => {
      const date = session.createdAt.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = { sessions: 0, messages: 0 };
      acc[date].sessions += 1;
      acc[date].messages += Array.isArray(session.messages) ? session.messages.length : 0;
      return acc;
    }, {} as Record<string, { sessions: number; messages: number }>);

    res.json({
      totalSessions,
      totalMessages,
      dailyUsage: Object.entries(dailyUsage).map(([date, usage]) => ({
        date,
        ...usage,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

export default router;