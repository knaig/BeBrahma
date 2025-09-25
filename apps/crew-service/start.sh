#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Install dependencies if needed
pip install -r requirements.txt

# Start the FastAPI service
echo "Starting CrewAI service on http://localhost:5055"
uvicorn main:app --host 0.0.0.0 --port 5055 --reload
