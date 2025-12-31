# Founder OS Deployment Guide

This guide covers deploying the Founder OS MVP to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [CI/CD Setup](#cicd-setup)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Software

- **Node.js**: v18.x or higher
- **PostgreSQL**: v14.x or higher
- **pnpm**: v8.x or higher (recommended) or npm v9.x
- **Git**: For version control

### Accounts & Services

- **Clerk**: For authentication ([clerk.com](https://clerk.com))
  - Create a Clerk application
  - Get API keys (Publishable Key and Secret Key)
- **PostgreSQL Database**: Production database instance
  - Recommended: Supabase, Railway, or managed PostgreSQL on AWS/GCP
- **Hosting Platform** (choose one):
  - Vercel (recommended for Next.js frontend)
  - Railway (for full-stack deployment)
  - AWS / GCP / Azure

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd BeBrahma
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Or using npm
npm install
```

### 3. Environment Variables

Create environment files for each application:

#### `/apps/api/.env`

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/bebrahma"

# Clerk Authentication
CLERK_SECRET_KEY="sk_test_..."

# Server
PORT=3001
NODE_ENV=development

# CORS (frontend URLs)
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"
```

#### `/apps/web/.env.local`

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# API Endpoint
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Local development with PostgreSQL
createdb bebrahma

# Or use a managed service like Supabase
# Get connection string and add to .env
```

### 2. Run Prisma Migrations

```bash
cd apps/api

# Generate Prisma Client
npx prisma generate

# Run migrations (create tables)
npx prisma migrate deploy

# Or manually apply the SQL migration
psql $DATABASE_URL -f prisma/migrations/20251231_add_founder_os_models/migration.sql
```

### 3. Seed Database (Optional)

```bash
# Create a seed script if needed
npx prisma db seed
```

### 4. Verify Database Schema

```bash
# Open Prisma Studio to inspect database
npx prisma studio
```

---

## Application Deployment

### Development Mode

```bash
# Terminal 1: Start API server
cd apps/api
pnpm dev

# Terminal 2: Start Next.js frontend
cd apps/web
pnpm dev
```

Visit:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Founder OS: http://localhost:3000/founder-os

### Build for Production

```bash
# Build API
cd apps/api
pnpm build

# Build Web frontend
cd apps/web
pnpm build
```

### Run Production Build

```bash
# API
cd apps/api
NODE_ENV=production node dist/server.js

# Web
cd apps/web
pnpm start
```

---

## Testing

### Run All Tests

```bash
# API Tests
cd apps/api
pnpm test

# Founder OS API Tests specifically
pnpm test founder-os

# Web Tests (Playwright)
cd apps/web
pnpm test:ui

# All tests
pnpm test:all
```

### Test Coverage

```bash
cd apps/api
pnpm test --coverage
```

---

## Production Deployment

### Option 1: Vercel + Railway

**Best for:** Scalable, managed deployments

#### Deploy API to Railway

1. Create Railway project
2. Add PostgreSQL service
3. Connect GitHub repository
4. Configure environment variables:
   ```
   DATABASE_URL (auto-provisioned from PostgreSQL service)
   CLERK_SECRET_KEY
   ALLOWED_ORIGINS
   NODE_ENV=production
   ```
5. Add build command: `cd apps/api && pnpm install && pnpm build`
6. Add start command: `cd apps/api && node dist/server.js`

#### Deploy Frontend to Vercel

1. Import GitHub repository to Vercel
2. Set root directory: `apps/web`
3. Configure environment variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   CLERK_SECRET_KEY
   NEXT_PUBLIC_API_URL (Railway API URL)
   NEXT_PUBLIC_APP_URL (Vercel URL)
   ```
4. Deploy

### Option 2: Docker Deployment

#### Create Dockerfile for API

```dockerfile
# /apps/api/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api ./apps/api
COPY prisma ./prisma

# Build
WORKDIR /app/apps/api
RUN pnpm build

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

#### Create Dockerfile for Web

```dockerfile
# /apps/web/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: bebrahma
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: bebrahma
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://bebrahma:your_password@postgres:5432/bebrahma
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001/api
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

### Option 3: AWS Deployment

#### Architecture

```
┌─────────────┐
│   Route 53  │ (DNS)
└──────┬──────┘
       │
┌──────▼──────┐
│   CloudFront│ (CDN)
└──────┬──────┘
       │
┌──────▼──────────────────┐
│ S3 + Next.js (Frontend) │
└─────────────────────────┘
       │
┌──────▼──────────────────┐
│   API Gateway + Lambda  │ (API)
└──────┬──────────────────┘
       │
┌──────▼──────────────────┐
│   RDS PostgreSQL        │
└─────────────────────────┘
```

**Steps:**
1. Deploy frontend to S3 with CloudFront
2. Deploy API to Lambda with API Gateway
3. Use RDS for PostgreSQL
4. Configure VPC and security groups

---

## CI/CD Setup

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Founder OS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run Prisma migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
        run: |
          cd apps/api
          npx prisma migrate deploy

      - name: Run API tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
        run: |
          cd apps/api
          pnpm test

      - name: Build API
        run: |
          cd apps/api
          pnpm build

      - name: Build Web
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
        run: |
          cd apps/web
          pnpm build

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        uses: railwayapp/railway-deploy@v1
        with:
          service: api
          token: ${{ secrets.RAILWAY_TOKEN }}

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/web
```

### Required GitHub Secrets

Add these in GitHub Settings → Secrets:

```
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_API_URL
RAILWAY_TOKEN (if using Railway)
VERCEL_TOKEN (if using Vercel)
VERCEL_ORG_ID
VERCEL_PROJECT_ID
DATABASE_URL (production)
```

---

## Monitoring & Maintenance

### Application Monitoring

1. **Error Tracking**: Integrate Sentry
   ```bash
   pnpm add @sentry/nextjs @sentry/node
   ```

2. **Analytics**: PostHog (already integrated)
   - Track user behavior
   - Monitor feature adoption

3. **Logs**: CloudWatch, Datadog, or Papertrail
   - API request logs
   - Error logs
   - Performance metrics

### Database Monitoring

1. **Query Performance**: Use `EXPLAIN ANALYZE` for slow queries
2. **Indexes**: Monitor index usage
   ```sql
   SELECT * FROM pg_stat_user_indexes;
   ```
3. **Backup**: Automate daily backups
   ```bash
   pg_dump -U user -d bebrahma > backup_$(date +%Y%m%d).sql
   ```

### Health Checks

Create API health endpoint:

```typescript
// /apps/api/src/routes/health.ts
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
    });
  }
});
```

### Scaling Considerations

**Database:**
- Enable read replicas for high traffic
- Use connection pooling (PgBouncer)
- Implement caching with Redis

**API:**
- Horizontal scaling with load balancer
- Rate limiting to prevent abuse
- CDN for static assets

**Frontend:**
- SSR/ISR optimization in Next.js
- Edge caching with CloudFront/Vercel

---

## Rollback Procedures

### Database Rollback

```bash
# View migration history
npx prisma migrate history

# Rollback last migration
npx prisma migrate down
```

### Application Rollback

**Railway:**
```bash
railway rollback
```

**Vercel:**
- Go to Deployments tab
- Promote previous deployment

**Docker:**
```bash
docker pull yourdomain/api:previous-tag
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**2. Prisma Client Not Generated**
```bash
cd apps/api
npx prisma generate
```

**3. CORS Errors**
- Verify `ALLOWED_ORIGINS` in API .env
- Check API URL in frontend .env

**4. Clerk Auth Errors**
- Verify API keys match environment
- Check Clerk dashboard for domain configuration

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL/TLS certificates installed
- [ ] CORS configured correctly
- [ ] API rate limiting enabled
- [ ] Error tracking (Sentry) configured
- [ ] Database backups automated
- [ ] Health checks implemented
- [ ] Monitoring dashboards set up
- [ ] CI/CD pipeline tested
- [ ] Documentation updated
- [ ] Security audit completed

---

## Support & Resources

- **Documentation**: `/docs/FOUNDER_OS_README.md`
- **API Reference**: `/docs/PRD_FOUNDER_OS.md`
- **GitHub Issues**: [Repository Issues](https://github.com/yourorg/bebrahma/issues)
- **Slack/Discord**: [Community Channel]

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0 (MVP)
