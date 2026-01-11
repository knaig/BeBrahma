# Decision OS Backend - Setup Guide

## Overview

The Decision OS backend has been fully implemented with a complete REST API, OAuth integrations, and automatic evidence capture service. This document covers setup, configuration, and usage.

## What's Been Built

### 1. Database Schema (Prisma)

**Models Added:**
- `Venture` - Solo founder's business venture with budgets and WIP limits
- `Direction` - Strategic direction (ICP + Problem + Offer + Channel + Price)
- `DecisionExperiment` - Testable experiment with multi-gate evaluation
- `ExperimentGate` - Sequential evaluation gates with pass/fail criteria
- `DecisionEvidence` - Evidence collected across the 5-rung ladder
- `DecisionEvent` - Log of all founder decisions
- `OverrideEvent` - Track policy overrides with justifications
- `Integration` - Connected tools for automatic evidence capture

**Enums Added:**
- `EvidenceRung`: SYNTHETIC, ATTENTION, INTENT, COMMITMENT, RETENTION
- `DirectionStatus`: PENDING, FUNDED, DEFERRED, KILLED
- `ExperimentStatus`: DRAFT, QUEUED, RUNNING, COMPLETED, FAILED
- `FounderProfile`: SPRINTER, BALANCED, METHODICAL
- `SpeedMode`: FAST, SLOW
- `IntegrationStatus`: DISCONNECTED, CONNECTING, CONNECTED, ERROR

### 2. API Routes

All routes are prefixed with `/api/v1`

**Venture Management:**
- `GET /ventures/:id` - Get venture details with relations
- `POST /ventures` - Create new venture
- `PATCH /ventures/:id` - Update venture settings

**Direction Management:**
- `GET /ventures/:ventureId/directions` - List all directions
- `POST /ventures/:ventureId/directions` - Create new direction
- `PATCH /directions/:id` - Update direction
- `POST /directions/:id/fund` - Fund a direction
- `POST /directions/:id/kill` - Kill a direction
- `GET /directions/:id/vc-memo` - Generate VC-style investment memo

**Experiment Management:**
- `POST /directions/:directionId/experiments` - Create experiment
- `PATCH /experiments/:id` - Update experiment
- `POST /experiments/:id/queue` - Queue experiment for execution
- `POST /experiments/:id/run` - Execute experiment
- `POST /experiments/:id/evaluate` - Evaluate experiment gates
- `POST /experiments/:id/complete` - Mark experiment complete

**Evidence Tracking:**
- `GET /directions/:directionId/evidence` - List evidence for direction
- `POST /directions/:directionId/evidence` - Add evidence manually
- `GET /evidence/:id` - Get evidence details

**Decision Logging:**
- `POST /decisions` - Log a founder decision
- `GET /ventures/:ventureId/decisions` - Get decision history

**Override Tracking:**
- `POST /overrides` - Record a policy override
- `GET /ventures/:ventureId/overrides` - Get override history

**Loop Tick:**
- `POST /ventures/:ventureId/tick` - Run weekly allocation and evaluation

### 3. OAuth Integration System

Routes prefixed with `/api/v1/integrations`

**Integration Management:**
- `GET /` - List all integrations for a venture
- `POST /connect` - Initiate OAuth flow (returns auth URL)
- `GET /callback` - OAuth callback handler
- `POST /test` - Test integration connection
- `PATCH /:id/configure` - Update integration config
- `DELETE /:id` - Disconnect integration

**Supported Providers:**

1. **Google Workspace**
   - Gmail: Email reply tracking (Intent rung)
   - Calendar: Meeting scheduling (Intent/Attention rung)
   - Scopes: `gmail.readonly`, `calendar.readonly`

2. **HubSpot**
   - Deals: Pipeline movement tracking
   - Contacts: Contact engagement
   - Maps deal stages to rungs (closed = Commitment, proposal = Intent)

3. **Stripe**
   - Payments: Automatic payment capture (Commitment rung)
   - Subscriptions: Recurring revenue tracking

4. **GitHub**
   - Branches: Create feature branches
   - Pull Requests: Automated PR creation
   - Repositories: Code integration for shipping experiments

### 4. Evidence Auto-Capture Service

**How It Works:**
- Runs every 15 minutes via cron job
- Polls all connected integrations for new data
- Automatically creates evidence records
- Smart matching of evidence to directions

**Gmail Capture:**
- Filters for email replies (subject contains "re:")
- Matches sender to direction based on ICP keywords
- Creates Intent rung evidence

**Calendar Capture:**
- Looks for meetings with external attendees
- RSVP accepted = Intent rung
- RSVP pending = Attention rung

**HubSpot Capture:**
- Tracks deal stage changes
- Maps stages to appropriate rungs
- Links deals to directions by name matching

**Stripe Capture:**
- Captures successful payments
- Creates Commitment rung evidence
- Links to directions by customer email

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bebrahma"

# API URLs
API_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

STRIPE_CLIENT_ID="your-stripe-client-id"
STRIPE_SECRET_KEY="your-stripe-secret-key"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Token Encryption
ENCRYPTION_KEY="generate-32-byte-hex-key" # Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Database Migration

Run the Prisma migration to create all tables:

```bash
cd apps/api
npx prisma migrate dev --name add-decision-os-models
npx prisma generate
```

This will create all 8 models in your PostgreSQL database.

### 3. OAuth Setup

#### Google Workspace
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API and Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/v1/integrations/callback`
6. Copy Client ID and Client Secret to `.env`

#### HubSpot
1. Go to [HubSpot Developer Portal](https://developers.hubspot.com)
2. Create a new app
3. Add OAuth scopes: `crm.objects.deals.read`, `crm.objects.contacts.read`
4. Set redirect URI: `http://localhost:3001/api/v1/integrations/callback`
5. Copy App ID and Client Secret to `.env`

#### Stripe
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Connect
3. Create a Connect platform
4. Add redirect URI: `http://localhost:3001/api/v1/integrations/callback`
5. Copy Client ID and Secret Key to `.env`

#### GitHub
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set authorization callback URL: `http://localhost:3001/api/v1/integrations/callback`
4. Copy Client ID and Client Secret to `.env`

### 4. Start the Server

```bash
cd apps/api
npm run dev
```

The server will:
- Start on port 3001
- Initialize WebSocket server
- Start evidence capture service
- Log all configuration status

## API Usage Examples

### Creating a Venture

```bash
curl -X POST http://localhost:3001/api/v1/ventures \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "name": "My SaaS Startup",
    "hoursPerWeek": 20,
    "sendsPerWeek": 100,
    "spendPerWeek": 500,
    "founderProfile": "BALANCED"
  }'
```

### Creating a Direction

```bash
curl -X POST http://localhost:3001/api/v1/ventures/v1/directions \
  -H "Content-Type: application/json" \
  -d '{
    "icp": "Solo founders with $10k MRR",
    "problem": "Overwhelmed by customer questions",
    "offer": "AI support agent",
    "channel": "Cold email",
    "price": "$299/mo"
  }'
```

### Connecting Google Workspace

```bash
# 1. Get auth URL
curl -X POST http://localhost:3001/api/v1/integrations/connect \
  -H "Content-Type: application/json" \
  -d '{
    "ventureId": "v1",
    "userId": "user123",
    "provider": "google"
  }'

# Response: { "authUrl": "https://accounts.google.com/...", "state": "..." }

# 2. Redirect user to authUrl
# 3. User authorizes and is redirected back to /callback
# 4. Callback handler stores tokens and redirects to frontend
```

### Running an Experiment

```bash
# 1. Create experiment
curl -X POST http://localhost:3001/api/v1/directions/d1/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Send 20 cold emails to test ICP",
    "hypothesis": "Solo founders with $10k MRR will reply",
    "approach": "Personalized cold email with demo offer",
    "targetRung": "ATTENTION",
    "estimatedHours": 3,
    "estimatedSends": 20,
    "estimatedSpend": 0
  }'

# 2. Queue experiment
curl -X POST http://localhost:3001/api/v1/experiments/e1/queue

# 3. Run experiment
curl -X POST http://localhost:3001/api/v1/experiments/e1/run

# 4. Add evidence (manual or auto-captured)
curl -X POST http://localhost:3001/api/v1/directions/d1/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "rung": "ATTENTION",
    "type": "email_reply",
    "description": "Founder replied asking for more info",
    "source": "manual"
  }'

# 5. Evaluate experiment
curl -X POST http://localhost:3001/api/v1/experiments/e1/evaluate
```

## Architecture Notes

### Token Security
- All OAuth tokens are encrypted using AES-256-CBC
- Random IV generated for each token
- Tokens stored as `iv:encryptedData` format
- Automatic token refresh on expiry

### Evidence Matching
- Smart matching algorithm finds relevant directions
- Matches based on ICP keywords in email/calendar/deals
- Fallback to funded direction if no match found
- Prevents duplicate evidence with `source` + `sourceId` unique constraint

### Gate Evaluation
- Sequential evaluation (stops at first failure)
- Flexible JSON-based conditions
- Supports: count, threshold, percentage checks
- Evidence passed to each gate for evaluation

### WIP Limits
- Enforced at API level
- Prevents funding more than `maxDirections`
- Prevents running more than `maxActiveExperiments`
- Returns clear error messages with current state

## Testing

### Health Check

```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "healthy",
  "services": {
    "database": { "connected": true },
    "decisionOS": { "enabled": true },
    "evidenceCapture": { "running": true }
  }
}
```

### Integration Test

After connecting an integration:

```bash
curl -X POST http://localhost:3001/api/v1/integrations/test \
  -H "Content-Type: application/json" \
  -d '{
    "integrationId": "int1"
  }'
```

Should return sample data from the integration.

## Next Steps

1. **Run Database Migration**: Set up PostgreSQL and run `prisma migrate dev`
2. **Configure OAuth Apps**: Set up credentials for each provider
3. **Start Backend Server**: Run `npm run dev` in apps/api
4. **Test API Endpoints**: Use curl or Postman to verify routes
5. **Connect Frontend**: Update frontend to use real API instead of mock
6. **Connect First Integration**: Test OAuth flow with Google Workspace
7. **Monitor Evidence Capture**: Check logs to see automatic evidence collection

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database exists: `psql -U user -d bebrahma`

### OAuth Errors
- Verify redirect URIs match exactly
- Check scopes are enabled in provider dashboard
- Ensure client credentials are correct
- Look for state mismatch errors (CSRF protection)

### Evidence Not Auto-Capturing
- Check cron service is running (see startup logs)
- Verify integration status is `CONNECTED`
- Check token expiry (automatic refresh should handle this)
- Look for errors in evidence capture logs

### Migration Errors
- Ensure no existing conflicting tables
- Check Prisma schema syntax
- Verify database user has CREATE TABLE permissions
- Run `npx prisma validate` to check schema

## Support

For issues or questions:
1. Check server logs: `npm run dev` output shows detailed errors
2. Check Prisma logs: Set `DEBUG=prisma:*` environment variable
3. Verify environment variables: All required vars must be set
4. Test individual routes: Use curl to isolate the issue

## Future Enhancements

Potential improvements:
- Webhooks for real-time evidence capture
- Machine learning for better direction matching
- Advanced gate evaluation with custom logic
- Multi-tenant support with workspace isolation
- Rate limiting for API calls
- Caching layer for frequently accessed data
- Background job queue for long-running experiments
