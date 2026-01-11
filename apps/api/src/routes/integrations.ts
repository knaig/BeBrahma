import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getOAuthProvider,
  GoogleWorkspaceProvider,
  HubSpotProvider,
  StripeProvider,
  GitHubProvider,
} from '../services/integrations/oauth-providers';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// In-memory state store (use Redis in production)
const oauthStates = new Map<string, { ventureId: string; userId: string; provider: string; expiresAt: number }>();

// Clean up expired states every hour
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (data.expiresAt < now) {
      oauthStates.delete(state);
    }
  }
}, 60 * 60 * 1000);

// ============================================================================
// OAUTH INITIATE
// ============================================================================

// POST /api/v1/integrations/connect
router.post('/connect', async (req, res) => {
  try {
    const { ventureId, userId, provider } = req.body;

    if (!ventureId || !userId || !provider) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const oauthProvider = getOAuthProvider(provider);
    if (!oauthProvider) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Generate state token
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, {
      ventureId,
      userId,
      provider,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Generate OAuth URL
    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/v1/integrations/callback`;
    const authUrl = oauthProvider.getAuthUrl(redirectUri, state);

    res.json({ authUrl, state });
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

// ============================================================================
// OAUTH CALLBACK
// ============================================================================

// GET /api/v1/integrations/callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/decision-os/integrations?error=${error}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/decision-os/integrations?error=missing_params`);
    }

    // Verify state
    const stateData = oauthStates.get(state as string);
    if (!stateData) {
      return res.redirect(`${process.env.FRONTEND_URL}/decision-os/integrations?error=invalid_state`);
    }

    oauthStates.delete(state as string);

    // Exchange code for tokens
    const oauthProvider = getOAuthProvider(stateData.provider);
    if (!oauthProvider) {
      return res.redirect(`${process.env.FRONTEND_URL}/decision-os/integrations?error=invalid_provider`);
    }

    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/v1/integrations/callback`;
    const tokens = await oauthProvider.exchangeCode(code as string, redirectUri);

    // Encrypt tokens before storing
    const accessToken = encryptToken(tokens.access_token);
    const refreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

    // Store integration
    await prisma.integration.upsert({
      where: {
        ventureId_provider: {
          ventureId: stateData.ventureId,
          provider: stateData.provider,
        },
      },
      update: {
        status: 'CONNECTED',
        accessToken,
        refreshToken,
        tokenExpiry: tokens.expires_in > 0 ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        lastSyncAt: new Date(),
        errorMessage: null,
      },
      create: {
        ventureId: stateData.ventureId,
        userId: stateData.userId,
        provider: stateData.provider,
        providerType: getProviderType(stateData.provider),
        status: 'CONNECTED',
        accessToken,
        refreshToken,
        tokenExpiry: tokens.expires_in > 0 ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      },
    });

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/decision-os/integrations?success=true&provider=${stateData.provider}`);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/decision-os/integrations?error=callback_failed`);
  }
});

// ============================================================================
// TEST CONNECTION
// ============================================================================

// POST /api/v1/integrations/:id/test
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (integration.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Integration not connected' });
    }

    // Decrypt access token
    const accessToken = decryptToken(integration.accessToken!);

    // Test connection based on provider
    let result;
    switch (integration.provider) {
      case 'google':
      case 'google_workspace':
        const googleProvider = new GoogleWorkspaceProvider();
        result = await googleProvider.testConnection(accessToken);
        break;

      case 'hubspot':
        const hubspotProvider = new HubSpotProvider();
        result = await hubspotProvider.testConnection(accessToken);
        break;

      case 'stripe':
        const stripeProvider = new StripeProvider();
        result = await stripeProvider.testConnection(accessToken);
        break;

      case 'github':
        const githubProvider = new GitHubProvider();
        result = await githubProvider.testConnection(accessToken);
        break;

      default:
        return res.status(400).json({ error: 'Unknown provider' });
    }

    // Update last sync time
    if (result.success) {
      await prisma.integration.update({
        where: { id },
        data: { lastSyncAt: new Date(), status: 'CONNECTED' },
      });
    } else {
      await prisma.integration.update({
        where: { id },
        data: { status: 'ERROR', errorMessage: 'Test connection failed' },
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// ============================================================================
// UPDATE CONFIGURATION
// ============================================================================

// POST /api/v1/integrations/:id/configure
router.post('/:id/configure', async (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.body;

    const integration = await prisma.integration.update({
      where: { id },
      data: { config },
    });

    res.json(integration);
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// ============================================================================
// DISCONNECT
// ============================================================================

// POST /api/v1/integrations/:id/disconnect
router.post('/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await prisma.integration.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
      },
    });

    res.json(integration);
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

// ============================================================================
// LIST INTEGRATIONS
// ============================================================================

// GET /api/v1/integrations
router.get('/', async (req, res) => {
  try {
    const { ventureId } = req.query;

    if (!ventureId) {
      return res.status(400).json({ error: 'ventureId required' });
    }

    const integrations = await prisma.integration.findMany({
      where: { ventureId: ventureId as string },
      select: {
        id: true,
        provider: true,
        providerType: true,
        status: true,
        lastSyncAt: true,
        errorMessage: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose tokens
        accessToken: false,
        refreshToken: false,
      },
    });

    res.json(integrations);
  } catch (error) {
    console.error('Error listing integrations:', error);
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function getProviderType(provider: string): string {
  const map: Record<string, string> = {
    google: 'google_workspace',
    google_workspace: 'google_workspace',
    hubspot: 'crm',
    stripe: 'payment',
    github: 'repo',
  };
  return map[provider] || 'unknown';
}

// Simple encryption (use proper key management in production)
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export default router;
