import { google } from 'googleapis';
import axios from 'axios';

export interface OAuthProvider {
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// ============================================================================
// GOOGLE WORKSPACE
// ============================================================================

export class GoogleWorkspaceProvider implements OAuthProvider {
  private clientId: string;
  private clientSecret: string;
  private scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('Google OAuth credentials not configured');
    }
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      redirectUri
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expiry_date ? (tokens.expiry_date - Date.now()) / 1000 : 3600,
      token_type: 'Bearer',
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || refreshToken,
      expires_in: credentials.expiry_date ? (credentials.expiry_date - Date.now()) / 1000 : 3600,
      token_type: 'Bearer',
    };
  }

  async testConnection(accessToken: string): Promise<{ success: boolean; data: any }> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      // Test Gmail
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const gmailResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: 'is:inbox',
      });

      // Test Calendar
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return {
        success: true,
        data: {
          emailsFound: gmailResponse.data.resultSizeEstimate || 0,
          scheduledCalls: calendarResponse.data.items?.length || 0,
          lastSync: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Google test connection failed:', error);
      return { success: false, data: null };
    }
  }
}

// ============================================================================
// HUBSPOT
// ============================================================================

export class HubSpotProvider implements OAuthProvider {
  private clientId: string;
  private clientSecret: string;
  private scopes = ['contacts', 'crm.objects.deals.read', 'crm.objects.contacts.read'];

  constructor() {
    this.clientId = process.env.HUBSPOT_CLIENT_ID || '';
    this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('HubSpot OAuth credentials not configured');
    }
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return response.data;
  }

  async testConnection(accessToken: string): Promise<{ success: boolean; data: any }> {
    try {
      // Fetch deals
      const dealsResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 },
      });

      // Fetch contacts
      const contactsResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 },
      });

      return {
        success: true,
        data: {
          dealsFound: dealsResponse.data.results?.length || 0,
          contactsFound: contactsResponse.data.results?.length || 0,
          lastSync: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('HubSpot test connection failed:', error);
      return { success: false, data: null };
    }
  }
}

// ============================================================================
// STRIPE
// ============================================================================

export class StripeProvider implements OAuthProvider {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.STRIPE_CLIENT_ID || '';
    this.clientSecret = process.env.STRIPE_SECRET_KEY || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('Stripe OAuth credentials not configured');
    }
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: 'read_only',
      redirect_uri: redirectUri,
      state,
    });

    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await axios.post(
      'https://connect.stripe.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: 0, // Stripe tokens don't expire
      token_type: 'bearer',
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    // Stripe tokens don't expire, but can be refreshed
    const response = await axios.post(
      'https://connect.stripe.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: 0,
      token_type: 'bearer',
    };
  }

  async testConnection(accessToken: string): Promise<{ success: boolean; data: any }> {
    try {
      // Fetch recent charges
      const response = await axios.get('https://api.stripe.com/v1/charges', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 },
      });

      const charges = response.data.data || [];
      const revenue = charges.reduce((sum: number, charge: any) => sum + (charge.amount || 0), 0) / 100;

      return {
        success: true,
        data: {
          paymentsFound: charges.length,
          revenue: `$${revenue.toLocaleString()}`,
          lastSync: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Stripe test connection failed:', error);
      return { success: false, data: null };
    }
  }
}

// ============================================================================
// GITHUB
// ============================================================================

export class GitHubProvider implements OAuthProvider {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('GitHub OAuth credentials not configured');
    }
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'repo',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    return {
      access_token: response.data.access_token,
      expires_in: 0, // GitHub tokens don't expire
      token_type: 'bearer',
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    throw new Error('GitHub tokens do not support refresh');
  }

  async testConnection(accessToken: string): Promise<{ success: boolean; data: any }> {
    try {
      // Fetch user's repos
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page: 100 },
      });

      return {
        success: true,
        data: {
          reposFound: response.data.length,
          selectedRepo: response.data[0]?.full_name || null,
        },
      };
    } catch (error) {
      console.error('GitHub test connection failed:', error);
      return { success: false, data: null };
    }
  }
}

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

export function getOAuthProvider(provider: string): OAuthProvider | null {
  switch (provider) {
    case 'google':
    case 'google_workspace':
      return new GoogleWorkspaceProvider();
    case 'hubspot':
      return new HubSpotProvider();
    case 'stripe':
      return new StripeProvider();
    case 'github':
      return new GitHubProvider();
    default:
      return null;
  }
}
