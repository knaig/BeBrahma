#!/bin/bash

# BeBrahma Enhanced Testing Framework - Cycle Runner Script

set -e

echo "🧪 BeBrahma Enhanced Testing Framework"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the enhanced-test-framework directory"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Creating from example..."
    if [ -f "env.example" ]; then
        cp env.example .env.local
        echo "📝 Please edit .env.local with your API keys before running tests"
        exit 1
    else
        echo "❌ Error: env.example not found"
        exit 1
    fi
fi

# Parse command line arguments
INTERACTIVE=false
DOMAIN=""
COMPLEXITY=""
COMPARE=false
HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--interactive)
            INTERACTIVE=true
            shift
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -c|--complexity)
            COMPLEXITY="$2"
            shift 2
            ;;
        --compare)
            COMPARE=true
            shift
            ;;
        -h|--help)
            HELP=true
            shift
            ;;
        *)
            echo "❌ Unknown option: $1"
            HELP=true
            shift
            ;;
    esac
done

if [ "$HELP" = true ]; then
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -i, --interactive    Run in interactive mode"
    echo "  -d, --domain         Specify business domain to test"
    echo "  -c, --complexity     Specify complexity level (low|medium|high)"
    echo "  --compare            Enable competitor comparison"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --interactive"
    echo "  $0 --domain 'SaaS Business Planning' --compare"
    echo "  $0 --complexity high --domain 'FinTech Product Strategy'"
    echo ""
    exit 0
fi

# Build the command
CMD="npm run test:cycle"

if [ "$INTERACTIVE" = true ]; then
    CMD="$CMD -- --interactive"
else
    if [ ! -z "$DOMAIN" ]; then
        CMD="$CMD -- --domain '$DOMAIN'"
    fi
    
    if [ ! -z "$COMPLEXITY" ]; then
        CMD="$CMD -- --complexity $COMPLEXITY"
    fi
    
    if [ "$COMPARE" = true ]; then
        CMD="$CMD -- --compare"
    fi
fi

echo ""
echo "🚀 Running test cycle with command:"
echo "   $CMD"
echo ""

# Run the test cycle
eval $CMD

echo ""
echo "✅ Test cycle completed!"
echo "📊 Check the test-results directory for detailed reports"
