import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import axios from 'axios';
import cron from 'node-cron';

const prisma = new PrismaClient();

// ============================================================================
// EVIDENCE AUTO-CAPTURE SERVICE
// ============================================================================

export class EvidenceCaptureService {
  private isRunning = false;

  /**
   * Start the evidence capture cron job
   * Runs every 15 minutes to check for new evidence
   */
  start() {
    if (this.isRunning) {
      console.log('Evidence capture service already running');
      return;
    }

    console.log('Starting evidence capture service...');
    this.isRunning = true;

    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('Running evidence capture...');
      await this.captureAllEvidence();
    });

    // Run once on startup
    this.captureAllEvidence();
  }

  /**
   * Capture evidence from all connected integrations
   */
  async captureAllEvidence() {
    try {
      const integrations = await prisma.integration.findMany({
        where: { status: 'CONNECTED' },
        include: { venture: { include: { directions: true } } },
      });

      for (const integration of integrations) {
        try {
          await this.captureEvidenceForIntegration(integration);
        } catch (error) {
          console.error(`Error capturing evidence for integration ${integration.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in evidence capture:', error);
    }
  }

  /**
   * Capture evidence from a specific integration
   */
  private async captureEvidenceForIntegration(integration: any) {
    console.log(`Capturing evidence for ${integration.provider}...`);

    const accessToken = this.decryptToken(integration.accessToken);
    const config = integration.config || {};

    switch (integration.provider) {
      case 'google':
      case 'google_workspace':
        await this.captureGoogleEvidence(integration, accessToken, config);
        break;

      case 'hubspot':
        await this.captureHubSpotEvidence(integration, accessToken, config);
        break;

      case 'stripe':
        await this.captureStripeEvidence(integration, accessToken, config);
        break;

      default:
        console.log(`No capture handler for provider: ${integration.provider}`);
    }

    // Update last sync time
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * Capture evidence from Google Workspace (Gmail + Calendar)
   */
  private async captureGoogleEvidence(integration: any, accessToken: string, config: any) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const lastSync = integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Capture Gmail evidence
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const emailQuery = this.buildGmailQuery(config, lastSync);

    const emailsResponse = await gmail.users.messages.list({
      userId: 'me',
      q: emailQuery,
      maxResults: 100,
    });

    const messages = emailsResponse.data.messages || [];
    for (const message of messages.slice(0, 20)) {
      // Limit to 20 per run
      await this.processGmailMessage(integration, gmail, message.id!);
    }

    // Capture Calendar evidence
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: lastSync.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = eventsResponse.data.items || [];
    for (const event of events) {
      await this.processCalendarEvent(integration, event);
    }

    console.log(`Captured ${messages.length} emails and ${events.length} calendar events`);
  }

  /**
   * Process a Gmail message and create evidence
   */
  private async processGmailMessage(integration: any, gmail: any, messageId: string) {
    try {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = message.data.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const isReply = subject.toLowerCase().includes('re:');

      // Only capture replies (intent/attention rung)
      if (!isReply) return;

      // Find matching direction based on email domain
      const direction = await this.findMatchingDirection(integration.ventureId, from);
      if (!direction) return;

      // Check if already captured
      const existing = await prisma.decisionEvidence.findFirst({
        where: {
          ventureId: integration.ventureId,
          source: 'gmail',
          sourceId: messageId,
        },
      });

      if (existing) return;

      // Create evidence
      await prisma.decisionEvidence.create({
        data: {
          ventureId: integration.ventureId,
          directionId: direction.id,
          rung: 'INTENT',
          type: 'email_reply',
          description: `Email reply received: ${subject}`,
          data: {
            from,
            subject,
            messageId,
          },
          source: 'gmail',
          sourceId: messageId,
        },
      });

      console.log(`Created evidence from email: ${subject}`);
    } catch (error) {
      console.error('Error processing Gmail message:', error);
    }
  }

  /**
   * Process a Calendar event and create evidence
   */
  private async processCalendarEvent(integration: any, event: any) {
    try {
      const eventId = event.id;
      const summary = event.summary || '';
      const attendees = event.attendees || [];

      // Only capture meetings with external attendees
      if (attendees.length === 0) return;

      // Find matching direction
      const direction = await this.findMatchingDirection(
        integration.ventureId,
        attendees.map((a: any) => a.email).join(',')
      );
      if (!direction) return;

      // Check if already captured
      const existing = await prisma.decisionEvidence.findFirst({
        where: {
          ventureId: integration.ventureId,
          source: 'calendar',
          sourceId: eventId,
        },
      });

      if (existing) return;

      // Create evidence based on RSVP status
      const rung = attendees.some((a: any) => a.responseStatus === 'accepted') ? 'INTENT' : 'ATTENTION';

      await prisma.decisionEvidence.create({
        data: {
          ventureId: integration.ventureId,
          directionId: direction.id,
          rung,
          type: rung === 'INTENT' ? 'scheduled_meeting' : 'calendar_invite',
          description: `Calendar event: ${summary}`,
          data: {
            summary,
            start: event.start,
            end: event.end,
            attendees: attendees.length,
          },
          source: 'calendar',
          sourceId: eventId,
        },
      });

      console.log(`Created evidence from calendar: ${summary}`);
    } catch (error) {
      console.error('Error processing calendar event:', error);
    }
  }

  /**
   * Capture evidence from HubSpot
   */
  private async captureHubSpotEvidence(integration: any, accessToken: string, config: any) {
    const lastSync = integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch recent deal updates
    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        limit: 100,
        properties: ['dealname', 'amount', 'dealstage', 'closedate'],
        associations: ['contacts'],
      },
    });

    const deals = response.data.results || [];

    for (const deal of deals) {
      // Find matching direction
      const direction = await this.findMatchingDirection(integration.ventureId, deal.properties.dealname);
      if (!direction) continue;

      // Check if already captured
      const existing = await prisma.decisionEvidence.findFirst({
        where: {
          ventureId: integration.ventureId,
          source: 'hubspot',
          sourceId: deal.id,
        },
      });

      if (existing) continue;

      // Determine rung based on deal stage
      const stage = deal.properties.dealstage?.toLowerCase() || '';
      let rung: 'ATTENTION' | 'INTENT' | 'COMMITMENT' = 'ATTENTION';

      if (stage.includes('closed') || stage.includes('won')) {
        rung = 'COMMITMENT';
      } else if (stage.includes('proposal') || stage.includes('negotiation')) {
        rung = 'INTENT';
      }

      // Create evidence
      await prisma.decisionEvidence.create({
        data: {
          ventureId: integration.ventureId,
          directionId: direction.id,
          rung,
          type: 'deal_movement',
          description: `Deal updated: ${deal.properties.dealname} (${stage})`,
          data: {
            dealId: deal.id,
            dealName: deal.properties.dealname,
            amount: deal.properties.amount,
            stage: deal.properties.dealstage,
          },
          source: 'hubspot',
          sourceId: deal.id,
        },
      });

      console.log(`Created evidence from HubSpot deal: ${deal.properties.dealname}`);
    }
  }

  /**
   * Capture evidence from Stripe
   */
  private async captureStripeEvidence(integration: any, accessToken: string, config: any) {
    const lastSync = integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch recent charges
    const response = await axios.get('https://api.stripe.com/v1/charges', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        limit: 100,
        created: { gte: Math.floor(lastSync.getTime() / 1000) },
      },
    });

    const charges = response.data.data || [];

    for (const charge of charges) {
      if (!charge.paid) continue;

      // Find matching direction (simplified - match by customer email)
      const direction = await this.findMatchingDirection(integration.ventureId, charge.billing_details?.email || '');
      if (!direction) continue;

      // Check if already captured
      const existing = await prisma.decisionEvidence.findFirst({
        where: {
          ventureId: integration.ventureId,
          source: 'stripe',
          sourceId: charge.id,
        },
      });

      if (existing) continue;

      // Create evidence
      await prisma.decisionEvidence.create({
        data: {
          ventureId: integration.ventureId,
          directionId: direction.id,
          rung: 'COMMITMENT',
          type: 'payment',
          description: `Payment received: $${charge.amount / 100}`,
          data: {
            chargeId: charge.id,
            amount: charge.amount / 100,
            currency: charge.currency,
            customer: charge.customer,
          },
          source: 'stripe',
          sourceId: charge.id,
        },
      });

      console.log(`Created evidence from Stripe: $${charge.amount / 100}`);
    }
  }

  /**
   * Find matching direction based on email/text matching
   */
  private async findMatchingDirection(ventureId: string, text: string): Promise<any | null> {
    const directions = await prisma.direction.findMany({
      where: { ventureId, status: { in: ['PENDING', 'FUNDED'] } },
    });

    // Simple matching - check if ICP or problem mentioned
    for (const direction of directions) {
      const keywords = [
        direction.icp.toLowerCase(),
        ...direction.icp.toLowerCase().split(' '),
        ...direction.problem.toLowerCase().split(' ').filter((w) => w.length > 4),
      ];

      if (keywords.some((keyword) => text.toLowerCase().includes(keyword))) {
        return direction;
      }
    }

    // Return first funded direction as fallback
    return directions.find((d) => d.status === 'FUNDED') || directions[0] || null;
  }

  /**
   * Build Gmail query based on configuration
   */
  private buildGmailQuery(config: any, since: Date): string {
    const parts = ['in:inbox'];

    if (config.emailFilters) {
      parts.push(config.emailFilters);
    }

    // Date filter
    const dateStr = since.toISOString().split('T')[0].replace(/-/g, '/');
    parts.push(`after:${dateStr}`);

    return parts.join(' ');
  }

  /**
   * Decrypt token (same as integrations route)
   */
  private decryptToken(encryptedToken: string): string {
    // This should match the encryption in integrations.ts
    // For simplicity, assuming tokens are stored in plain text (NEVER do this in production!)
    return encryptedToken;
  }
}

// Export singleton
export const evidenceCaptureService = new EvidenceCaptureService();
