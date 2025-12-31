#!/bin/bash

# Founder OS Desktop - Development Launcher
# This script starts the API, Web, and Desktop app in the correct order

set -e

echo "🚀 Starting Founder OS Desktop Development Environment..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from apps/desktop directory"
    exit 1
fi

# Go to repo root
cd ../..

# Check if dependencies are installed
echo -e "${BLUE}📦 Checking dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing root dependencies...${NC}"
    pnpm install
fi

if [ ! -d "apps/api/node_modules" ]; then
    echo -e "${YELLOW}Installing API dependencies...${NC}"
    cd apps/api && pnpm install && cd ../..
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo -e "${YELLOW}Installing Web dependencies...${NC}"
    cd apps/web && pnpm install && cd ../..
fi

if [ ! -d "apps/desktop/node_modules" ]; then
    echo -e "${YELLOW}Installing Desktop dependencies...${NC}"
    cd apps/desktop && pnpm install && cd ../..
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

# Kill any existing processes on ports 3000 and 3001
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo -e "${GREEN}✅ Ports cleared${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down...${NC}"
    kill 0
    exit
}

trap cleanup INT TERM

# Start API server in background
echo -e "${BLUE}🔧 Starting API server on port 3001...${NC}"
cd apps/api
pnpm dev > /tmp/founder-os-api.log 2>&1 &
API_PID=$!
cd ../..

# Wait for API to be ready
echo -e "${YELLOW}⏳ Waiting for API server...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null; then
        echo -e "${GREEN}✅ API server ready${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  API server taking longer than expected${NC}"
    fi
done
echo ""

# Start Web server in background
echo -e "${BLUE}🌐 Starting Web server on port 3000...${NC}"
cd apps/web
pnpm dev > /tmp/founder-os-web.log 2>&1 &
WEB_PID=$!
cd ../..

# Wait for Web to be ready
echo -e "${YELLOW}⏳ Waiting for Web server...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✅ Web server ready${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Web server taking longer than expected${NC}"
    fi
done
echo ""

# Start Desktop app (foreground)
echo -e "${BLUE}🖥️  Launching Desktop app...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Founder OS Desktop is starting!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "API:      ${BLUE}http://localhost:3001${NC}"
echo -e "Web:      ${BLUE}http://localhost:3000${NC}"
echo -e "Desktop:  ${GREEN}Launching...${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

cd apps/desktop
pnpm dev

# Cleanup when desktop app exits
cleanup
