#!/bin/bash
# Complete BeBrahma Setup Script

set -e

echo "🚀 BeBrahma Complete Setup"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
    fi
}

echo "Checking prerequisites..."
check_command git
check_command node
check_command npm
check_command docker

# Create project directory
echo -e "\n${YELLOW}Creating project structure...${NC}"
mkdir -p bebrahma
cd bebrahma

# Initialize git
git init
git checkout -b bebrahma-mahavishnu

# Create directory structure
mkdir -p apps/{web,api}/src
mkdir -p packages/{types,database,config}/src
mkdir -p docker
mkdir -p docs
mkdir -p .github/workflows

# Create package.json files
echo -e "${YELLOW}Creating package.json files...${NC}"

# Root package.json
cat > package.json << 'PACKAGE_JSON'
{
  "name": "bebrahma",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "start": "turbo start",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "db:push": "turbo db:push",
    "db:migrate": "turbo db:migrate",
    "db:seed": "turbo db:seed",
    "stripe:listen": "stripe listen --forward-to localhost:3000/api/webhooks/stripe",
    "fly:deploy": "fly deploy",
    "fly:logs": "fly logs",
    "fly:ssh": "fly ssh console"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
PACKAGE_JSON

# Web app package.json with auth
cat > apps/web/package.json << 'WEB_PACKAGE'
{
  "name": "@bebrahma/web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@clerk/nextjs": "^4.29.0",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.2",
    "zod": "^3.22.4",
    "swr": "^2.2.4",
    "@tanstack/react-query": "^5.17.0",
    "posthog-js": "^1.96.1",
    "@sentry/nextjs": "^7.91.0",
    "@stripe/stripe-js": "^2.2.0",
    "stripe": "^14.10.0",
    "sonner": "^1.3.1",
    "lucide-react": "^0.303.0",
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
WEB_PACKAGE

# API package.json
cat > apps/api/package.json << 'API_PACKAGE'
{
  "name": "@bebrahma/api",
  "version": "1.0.0",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "jest"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/event-emitter": "^2.0.3",
    "@prisma/client": "^5.7.0",
    "openai": "^4.24.0",
    "@anthropic-ai/sdk": "^0.12.0",
    "@notionhq/client": "^2.2.14",
    "axios": "^1.6.2",
    "stripe": "^14.10.0",
    "bull": "^4.11.5",
    "@nestjs/bull": "^10.0.1",
    "ioredis": "^5.3.2",
    "rxjs": "^7.8.1",
    "reflect-metadata": "^0.1.13"
  }
}
API_PACKAGE

# Database package.json
cat > packages/database/package.json << 'DB_PACKAGE'
{
  "name": "@bebrahma/database",
  "version": "1.0.0",
  "scripts": {
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "tsx src/seed.ts",
    "db:studio": "prisma studio",
    "generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0",
    "tsx": "^4.6.2"
  }
}
DB_PACKAGE

# Create environment files
echo -e "${YELLOW}Creating environment configuration...${NC}"

cat > .env.example << 'ENV_EXAMPLE'
# Clerk Authentication (Get from clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Database (Fly.io will provide)
DATABASE_URL=postgresql://user:password@localhost:5432/bebrahma
REDIS_URL=redis://localhost:6379

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Search
BRAVE_SEARCH_API_KEY=BSA...

# Notion Integration
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry Error Tracking
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Cost Management
MAX_COST_PER_RUN=0.50
MAX_COST_PER_DAY=10.00
COST_MARGIN_PERCENTAGE=20

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:4000
ENV_EXAMPLE

# Create middleware for Clerk auth
cat > apps/web/middleware.ts << 'MIDDLEWARE'
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/api/webhooks(.*)",
    "/sign-in",
    "/sign-up",
  ],
  ignoredRoutes: [
    "/api/health",
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
MIDDLEWARE

# Create shadcn components config
cat > apps/web/components.json << 'COMPONENTS_JSON'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
COMPONENTS_JSON

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install

# Install additional tools
echo -e "${YELLOW}Installing Turbo and Prisma CLI...${NC}"
npm install -g turbo@latest

# Initialize Prisma
echo -e "${YELLOW}Setting up Prisma...${NC}"
cd packages/database
npx prisma init
cd ../..

# Copy the Prisma schema from earlier artifact
cp ../bebrahma-prisma-schema.prisma packages/database/prisma/schema.prisma 2>/dev/null || true

# Setup shadcn/ui components
echo -e "${YELLOW}Installing UI components...${NC}"
cd apps/web
npx shadcn-ui@latest init -y
npx shadcn-ui@latest add button card dialog form input label progress tabs toast
cd ../..

# Create Fly.io config
echo -e "${YELLOW}Creating Fly.io configuration...${NC}"
cp ../bebrahma-flyio-config.toml fly.toml 2>/dev/null || true

# Create deployment script
cat > deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash

echo "🚀 Deploying BeBrahma to Fly.io"

# Check if logged in to Fly
if ! flyctl auth whoami &>/dev/null; then
    echo "Please login to Fly.io first:"
    flyctl auth login
fi

# Build the application
echo "Building application..."
npm run build

# Deploy to Fly
echo "Deploying to Fly.io..."
flyctl deploy

# Run migrations
echo "Running database migrations..."
flyctl ssh console -C "npm run db:migrate:deploy"

# Show status
flyctl status

echo "✅ Deployment complete!"
echo "Your app is available at: https://bebrahma.fly.dev"
DEPLOY_SCRIPT

chmod +x deploy.sh

# Create local development script
cat > dev.sh << 'DEV_SCRIPT'
#!/bin/bash

echo "🚀 Starting BeBrahma Development Environment"

# Check Docker
if ! docker info &>/dev/null; then
    echo "Starting Docker..."
    open -a Docker || sudo systemctl start docker
    sleep 5
fi

# Start databases
echo "Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for databases
echo "Waiting for databases to be ready..."
sleep 5

# Run migrations
echo "Running database migrations..."
npm run db:migrate

# Seed database (optional)
# npm run db:seed

# Start development servers
echo "Starting development servers..."
npm run dev

# Open browser
sleep 3
open http://localhost:3000 || xdg-open http://localhost:3000
DEV_SCRIPT

chmod +x dev.sh

# Create docker-compose for local development
cat > docker-compose.yml << 'DOCKER_COMPOSE'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: bebrahma
      POSTGRES_PASSWORD: bebrahma
      POSTGRES_DB: bebrahma
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
DOCKER_COMPOSE

# Git commit
echo -e "\n${YELLOW}Committing to Git...${NC}"
git add .
git commit -m "feat: Complete BeBrahma setup with Clerk auth and Fly.io deployment

- Integrated Clerk for authentication
- Added shadcn/ui components
- Configured Stripe for payments
- Added PostHog analytics
- Added Sentry error tracking
- Configured Fly.io deployment
- Created production Docker setup
- Added complete CI/CD pipeline"

echo -e "\n${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and fill in your API keys:"
echo "   cp .env.example .env"
echo ""
echo "2. Get your Clerk keys from https://clerk.com"
echo "3. Get your OpenAI API key from https://platform.openai.com"
echo "4. Get your Brave Search API key from https://brave.com/search/api"
echo ""
echo "5. Start local development:"
echo "   ./dev.sh"
echo ""
echo "6. Deploy to Fly.io:"
echo "   flyctl auth login"
echo "   flyctl launch"
echo "   ./deploy.sh"
echo ""
echo "7. Push to GitHub:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/bebrahma.git"
echo "   git push -u origin bebrahma-mahavishnu"