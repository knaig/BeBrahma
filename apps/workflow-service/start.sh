#!/bin/bash

# BeBrahma LangGraph Workflow Service Startup Script

set -e

echo "🚀 Starting BeBrahma LangGraph Workflow Service..."

# Navigate to workflow service directory
cd "$(dirname "$0")"

# Check if Python virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Get port from config
WORKFLOW_PORT=$(python3 -c "
import sys
sys.path.append('../../config')
from port_manager import get_port
print(get_port('workflow_service', 'services'))
")

if [ -z "$WORKFLOW_PORT" ]; then
    WORKFLOW_PORT=5056
    echo "⚠️  Could not get port from config, using default: $WORKFLOW_PORT"
else
    echo "🔌 Using port from config: $WORKFLOW_PORT"
fi

# Set environment variables
export PORT=$WORKFLOW_PORT
export CREW_SERVICE_URL=${CREW_SERVICE_URL:-"http://localhost:5055"}

echo "🌐 Environment:"
echo "   PORT: $PORT"
echo "   CREW_SERVICE_URL: $CREW_SERVICE_URL"

# Start the service
echo "🚀 Starting LangGraph Workflow Service on port $PORT..."
python3 -m uvicorn src.main:app --host 0.0.0.0 --port $PORT --reload
