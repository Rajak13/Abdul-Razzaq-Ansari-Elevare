#!/bin/bash

# Start script for PEGASUS Summarization Service

echo "Starting PEGASUS Summarization Service..."

# Activate virtual environment
source venv/bin/activate

# Start the FastAPI service
python app/main.py