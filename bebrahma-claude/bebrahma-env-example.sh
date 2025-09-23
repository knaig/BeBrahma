# Database
DATABASE_URL=postgresql://bebrahma:bebrahma@localhost:5432/bebrahma
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# AI Models
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-opus-20240229

# Model Settings
MAX_TOKENS_PER_AGENT=2000
MAX_RETRIES=3
TEMPERATURE=0.7

# Search Integration
BRAVE_SEARCH_API_KEY=BSA...
SEARCH_RESULTS_LIMIT=10

# Notion Integration
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...

# Google Sheets Integration (OAuth2)
GOOGLE_SHEETS_CLIENT_ID=...
GOOGLE_SHEETS_CLIENT_SECRET=...
GOOGLE_SHEETS_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# GitHub Integration (stub)
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...

# Gmail Integration (stub)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars
JWT_SECRET=your-jwt-secret-here

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# Cost Management
MAX_COST_PER_RUN=0.50
MAX_COST_PER_DAY=10.00
MAX_COST_PER_TENANT=100.00
COST_MARGIN_PERCENTAGE=20

# Rate Limiting
RATE_LIMIT_RUNS_PER_MINUTE=5
RATE_LIMIT_EXPORTS_PER_HOUR=20

# Telemetry & Monitoring
TELEMETRY_ENABLED=true
SENTRY_DSN=https://...@sentry.io/...
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com

# Feature Flags
ENABLE_VECTOR_MEMORY=false
ENABLE_ADMIN_DASHBOARD=false
ENABLE_BULK_ACTIONS=false

# Security
ENCRYPTION_KEY=your-32-byte-encryption-key-here
PII_REDACTION_ENABLED=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000

# Deployment
FLY_API_TOKEN=...
VERCEL_TOKEN=...
DEPLOYMENT_ENV=local