#!/bin/bash

# BeBrahma Smoke Test Script
# Validates repository structure and Docker builds for CodeBuild parity
# This script clones the repo into a temp directory and tests all Docker builds

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEMP_DIR="/tmp/bebrahma-smoke-test-$(date +%s)"
REPO_URL="."  # Use current directory for local testing
TIMEOUT=300   # 5 minutes timeout per build

echo -e "${BLUE}🚀 Starting BeBrahma Smoke Test${NC}"
echo -e "${BLUE}📁 Temp directory: ${TEMP_DIR}${NC}"
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    print_status "INFO" "Cleaning up temporary directory..."
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        print_status "SUCCESS" "Cleanup completed"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Create temp directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Copy current repository (simulating a fresh clone)
print_status "INFO" "Copying repository structure..."
cp -r "$(dirname "$0")/.." ./bebrahma-test
cd bebrahma-test

# Verify required files exist
print_status "INFO" "Verifying repository structure..."

required_files=(
    "package.json"
    "turbo.json"
    "Dockerfile.api"
    "Dockerfile.crew-service"
    "Dockerfile.workflow-service"
    "apps/api/package.json"
    "apps/crew-service/requirements.txt"
    "apps/workflow-service/requirements.txt"
    "bebrahma/env.config.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "SUCCESS" "Found: $file"
    else
        print_status "ERROR" "Missing: $file"
        exit 1
    fi
done

echo ""
print_status "INFO" "Repository structure validation complete"
echo ""

# Test Docker builds
build_tests=(
    "API Service:Dockerfile.api"
    "CrewAI Service:Dockerfile.crew-service"
    "Workflow Service:Dockerfile.workflow-service"
)

build_results=()

for test in "${build_tests[@]}"; do
    IFS=':' read -r service_name dockerfile <<< "$test"
    
    print_status "INFO" "Building $service_name..."
    echo -e "${BLUE}📦 Dockerfile: $dockerfile${NC}"
    
    # Run build with timeout
    if timeout "$TIMEOUT" docker build -f "$dockerfile" . --no-cache > "build-${service_name,,}.log" 2>&1; then
        print_status "SUCCESS" "$service_name build completed"
        build_results+=("$service_name:SUCCESS")
    else
        print_status "ERROR" "$service_name build failed"
        echo -e "${RED}📋 Build log (last 20 lines):${NC}"
        tail -20 "build-${service_name,,}.log"
        build_results+=("$service_name:FAILED")
    fi
    echo ""
done

# Print summary
echo -e "${BLUE}📊 Build Summary${NC}"
echo "=================="

success_count=0
total_count=${#build_results[@]}

for result in "${build_results[@]}"; do
    IFS=':' read -r service status <<< "$result"
    if [ "$status" = "SUCCESS" ]; then
        print_status "SUCCESS" "$service"
        ((success_count++))
    else
        print_status "ERROR" "$service"
    fi
done

echo ""
echo -e "${BLUE}📈 Results: $success_count/$total_count builds successful${NC}"

if [ "$success_count" -eq "$total_count" ]; then
    print_status "SUCCESS" "All builds passed! Repository structure is valid."
    exit 0
else
    print_status "ERROR" "Some builds failed. Check the logs above for details."
    exit 1
fi
