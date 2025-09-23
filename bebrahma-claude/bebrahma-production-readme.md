# 🚀 BeBrahma - AI-Powered Virtual Co-Founder

Launch your startup in 48 hours with AI agents that research, validate, and plan your path to first customers.

[![Deploy to Fly.io](https://img.shields.io/badge/Deploy%20to-Fly.io-purple)](https://fly.io)
[![Powered by Clerk](https://img.shields.io/badge/Auth-Clerk-6C63FF)](https://clerk.com)
[![UI by shadcn](https://img.shields.io/badge/UI-shadcn%2Fui-black)](https://ui.shadcn.com)

## 🎯 Quick Start (5 minutes)

```bash
# Clone and setup
git clone https://github.com/yourusername/bebrahma.git
cd bebrahma
./setup.sh

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development
./dev.sh

# Open http://localhost:3000
```

## 🔑 Required API Keys

You'll need to sign up for these services (all have free tiers):

1. **[Clerk](https://clerk.com)** - Authentication
   - Create new application
   - Copy Publishable Key and Secret Key
   
2. **[OpenAI](https://platform.openai.com)** - AI Models
   - Generate API key
   
3. **[Brave Search](https://brave.com/search/api)** - Web Search
   - Sign up for free API access
   
4. **[Stripe](https://stripe.com)** (Optional) - Payments
   - Get test keys for development

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Next.js 14 Frontend               │
│     Clerk Auth | shadcn/ui | Tailwind      │
└─────────────────┬───────────────────────────┘
                  │ tRPC/REST API
┌─────────────────┴───────────────────────────┐
│            NestJS Backend                   │
│   Crew AI Agents | Tool Adapters | SSE     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│     PostgreSQL        │       Redis         │
└───────────────────────┴─────────────────────┘
```

## 🤖 Crew AI Agents

The system uses 5 specialized agents that collaborate:

| Agent | Role | Output |
|-------|------|--------|
| **Founder-PM** | Refines problem statements | Problem Brief |
| **Researcher** | Gathers market data with citations | Market Snapshot |
| **Evaluator** | Scores opportunities | Evaluation Report |
| **GTM-Seed** | Creates go-to-market strategy | GTM Plan |
| **Prompt-Engineer** | Generates build specifications | Cursor/v0 Prompt |

## 📦 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Auth**: Clerk
- **UI**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Analytics**: PostHog

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL + Prisma
- **Cache**: Redis
- **Queue**: Bull
- **AI**: OpenAI + Anthropic

### Infrastructure
- **Hosting**: Fly.io
- **Monitoring**: Sentry
- **Payments**: Stripe

## 🚀 Deployment

### Deploy to Fly.io (Recommended)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create app
flyctl launch

# Set secrets
flyctl secrets set \
  CLERK_SECRET_KEY="your-key" \
  OPENAI_API_KEY="your-key" \
  BRAVE_SEARCH_API_KEY="your-key"

# Deploy
flyctl deploy

# Open app
flyctl open
```

### Alternative: Deploy to Vercel + Railway

```bash
# Frontend (Vercel)
vercel --prod

# Backend (Railway)
railway login
railway link
railway up
```

## 🔧 Development

### Project Structure

```
bebrahma/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── database/     # Prisma schema
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared configuration
├── docker/           # Docker configurations
└── fly.toml          # Fly.io deployment config
```

### Commands

```bash
# Development
npm run dev           # Start all services
npm run db:studio     # Open Prisma Studio

# Testing
npm test             # Run tests
npm run test:e2e     # E2E tests

# Database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed data

# Deployment
npm run build        # Build for production
./deploy.sh          # Deploy to Fly.io
```

## 💰 Pricing Configuration

Edit pricing in `apps/api/src/billing/plans.ts`:

```typescript
export const PRICING_PLANS = {
  STARTER: {
    monthlyRuns: 5,
    price: 0,
    features: ['Basic agents', 'Email support']
  },
  PRO: {
    monthlyRuns: 30,
    price: 29,
    stripePriceId: 'price_...',
    features: ['All agents', 'Priority support', 'API access']
  }
}
```

## 🔐 Security

- All API keys stored in environment variables
- Clerk handles authentication and session management
- Row-level security with Prisma
- Rate limiting on all endpoints
- Cost caps per user/run
- Human-in-the-loop for risky actions

## 📊 Monitoring

### Logs
```bash
flyctl logs                # Production logs
npm run dev | pino-pretty  # Pretty dev logs
```

### Metrics
- PostHog: User analytics and feature flags
- Sentry: Error tracking and performance
- Stripe: Revenue and subscription metrics

## 🧪 Testing

```bash
# Run all tests
npm test

# Test citation validation
npm run test:citations

# Test specific agent
npm test -- --grep "Researcher"

# E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📝 Environment Variables

See `.env.example` for all required variables. Critical ones:

```env
# Authentication (Required)
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# AI (Required)
OPENAI_API_KEY=sk-...
BRAVE_SEARCH_API_KEY=BSA...

# Database (Auto-configured on Fly.io)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Optional but recommended
STRIPE_SECRET_KEY=sk_test_...
POSTHOG_API_KEY=phc_...
SENTRY_DSN=https://...
```

## 🐛 Troubleshooting

### Common Issues

**Database connection failed**
```bash
# Check if PostgreSQL is running
docker-compose ps
# Restart if needed
docker-compose restart postgres
```

**Clerk authentication not working**
- Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set
- Check webhook endpoint is configured in Clerk dashboard

**AI agents not responding**
- Check OpenAI API key and rate limits
- Verify BRAVE_SEARCH_API_KEY for research agent

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Agent Prompts](./docs/PROMPTS.md)
- [API Reference](./docs/API.md)
- [Security Guide](./docs/SECURITY.md)

## 📄 License

MIT - See [LICENSE](./LICENSE)

## 🙏 Acknowledgments

  Crew AI multi-agent collaboration patterns
- [shadcn/ui](https://ui.shadcn.com) for the beautiful components
- [Clerk](https://clerk.com) for seamless authentication
- [Fly.io](https://fly.io) for simple deployment

---

**Built with ❤️ for solo founders who ship fast**

Need help? [Open an issue](https://github.com/yourusername/bebrahma/issues) or reach out on [Discord](https://discord.gg/bebrahma)