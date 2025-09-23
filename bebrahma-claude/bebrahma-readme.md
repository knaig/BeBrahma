# BeBrahma - AI-Powered Virtual Co-Founder

## Why This Architecture?

We chose a **TypeScript monorepo** with Next.js 14 + Nest.js to maximize type safety and developer velocity. The Crew AI pattern is implemented for multi-agent collaboration, giving us full control over citation enforcement and cost management. PostgreSQL handles structured data with Redis for session management and real-time updates. This architecture prioritizes shipping quickly while maintaining production-grade quality.

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/bebrahma.git
cd bebrahma
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Start services
docker-compose up -d  # PostgreSQL + Redis
npm run db:migrate    # Run migrations
npm run seed          # Load demo data

# Start development
npm run dev           # Starts both frontend and backend

# Open http://localhost:3000
```

## Project Structure

```
bebrahma/
├── apps/
│   ├── web/                 # Next.js 14 frontend
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Frontend utilities
│   └── api/                 # Nest.js backend
│       ├── src/
│       │   ├── agents/      # CAMEL agent implementations
│       │   ├── tools/       # Tool adapters (Search, Notion, etc)
│       │   ├── runs/        # Run orchestration
│       │   └── auth/        # Authentication
│       └── test/
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── database/            # Prisma schema & migrations
│   └── config/              # Shared configuration
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── docker-compose.yml
└── docs/
    ├── SECURITY.md
    ├── PROMPTS.md
    └── EVALUATION.md
```

## Core Features

- **Crew AI Multi-Agent System**: Role-playing agents that collaborate to refine ideas
- **Citation-Required Policy**: All market claims must include source URLs
- **Human-in-the-Loop**: Approval required for risky actions
- **Real-time Chat**: SSE-powered streaming responses
- **Export Integrations**: Notion, Google Sheets, Cursor/Lovable
- **Usage-Based Pricing**: Metered billing with Stripe

## Agent Architecture

The system uses 5 specialized agents following Crew AI patterns:

1. **Founder-PM**: Refines problems into clear one-pagers
2. **Researcher**: Gathers market facts with citations
3. **Evaluator**: Scores opportunities on multiple dimensions
4. **GTM Seed**: Creates go-to-market experiments
5. **Prompt Engineer**: Generates build prompts for Cursor/Lovable

## API Endpoints

- `POST /api/runs/create` - Start a new agent run
- `GET /api/runs/:id` - Get run details and artifacts
- `GET /api/runs/:id/stream` - SSE stream for real-time updates
- `POST /api/artifacts/export` - Export to Notion/Sheets
- `GET /api/auth/session` - Current user session
- `POST /api/billing/usage` - Report usage for billing

## Environment Variables

See `.env.example` for all required variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bebrahma
REDIS_URL=redis://localhost:6379

# AI Models
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Integrations
BRAVE_SEARCH_API_KEY=...
NOTION_API_KEY=...
GOOGLE_SHEETS_CLIENT_ID=...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Billing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Development Commands

```bash
npm run dev           # Start development servers
npm run build         # Build for production
npm run test          # Run test suite
npm run lint          # Lint code
npm run typecheck     # TypeScript type checking
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed demo data
npm run docker:build  # Build Docker images
npm run docker:up     # Start with Docker Compose
```

## Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend (Fly.io)
```bash
fly deploy --config fly.api.toml
```

### Database (Neon/Supabase)
Use the connection string from your provider in `DATABASE_URL`

## Adding a New Tool Adapter

1. Create adapter in `apps/api/src/tools/adapters/`
2. Implement the `ToolAdapter` interface
3. Register in `apps/api/src/tools/tools.module.ts`
4. Add environment variables to `.env.example`
5. Update types in `packages/types/`

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires running app)
npm run test:e2e

# Citation enforcement test
npm run test:citations
```

## Security

- Secrets stored in environment variables
- OAuth2 for tool integrations
- Row-level security in PostgreSQL
- Rate limiting on API endpoints
- Cost caps per tenant
- PII redaction in logs

See [SECURITY.md](./docs/SECURITY.md) for details.

## License

MIT

## Support

- Documentation: [docs.bebrahma.com](https://docs.bebrahma.com)
- Issues: [GitHub Issues](https://github.com/yourusername/bebrahma/issues)
- Discord: [Join our community](https://discord.gg/bebrahma)