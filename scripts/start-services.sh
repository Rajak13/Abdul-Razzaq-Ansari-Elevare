#!/bin/bash

# Startup script for all Elevare services including summarization
# This script starts all required services in the correct order

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local timeout=${3:-60}
    
    print_status "Waiting for $name to be ready..."
    
    local counter=0
    while [ $counter -lt $timeout ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            print_status "$name is ready! ✅"
            return 0
        fi
        
        sleep 2
        counter=$((counter + 2))
        
        if [ $((counter % 10)) -eq 0 ]; then
            print_status "Still waiting for $name... (${counter}s elapsed)"
        fi
    done
    
    print_error "$name failed to start within ${timeout}s ❌"
    return 1
}

print_section "🚀 Starting Elevare Services"

# Check if services are already running
if check_port 8001; then
    print_warning "Summarization service already running on port 8001"
    SUMMARIZATION_RUNNING=true
else
    SUMMARIZATION_RUNNING=false
fi

if check_port 5001; then
    print_warning "Backend service already running on port 5001"
    BACKEND_RUNNING=true
else
    BACKEND_RUNNING=false
fi

if check_port 3000; then
    print_warning "Frontend service already running on port 3000"
    FRONTEND_RUNNING=true
else
    FRONTEND_RUNNING=false
fi

# Start Summarization Service (Python FastAPI)
if [ "$SUMMARIZATION_RUNNING" = false ]; then
    print_section "📝 Starting Summarization Service"
    
    # Check if Python dependencies are installed
    if [ ! -d "summarization-service/venv" ]; then
        print_status "Creating Python virtual environment..."
        cd summarization-service
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
    fi
    
    print_status "Starting Python FastAPI service on port 8001..."
    cd summarization-service
    source venv/bin/activate
    nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 > ../logs/summarization.log 2>&1 &
    SUMMARIZATION_PID=$!
    cd ..
    
    # Wait for summarization service to be ready (longer timeout for model loading)
    if wait_for_service "http://localhost:8001/health" "Summarization Service" 120; then
        print_status "Summarization service started successfully (PID: $SUMMARIZATION_PID)"
        echo $SUMMARIZATION_PID > .pids/summarization.pid
    else
        print_error "Failed to start summarization service"
        kill $SUMMARIZATION_PID 2>/dev/null || true
        exit 1
    fi
else
    print_status "Summarization service already running ✅"
fi

# Start Backend Service (Node.js Express)
if [ "$BACKEND_RUNNING" = false ]; then
    print_section "🔧 Starting Backend Service"
    
    # Check if Node dependencies are installed
    if [ ! -d "backend/node_modules" ]; then
        print_status "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
    fi
    
    print_status "Starting Node.js backend service on port 5001..."
    cd backend
    nohup npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend service to be ready
    if wait_for_service "http://localhost:5001/health" "Backend Service" 60; then
        print_status "Backend service started successfully (PID: $BACKEND_PID)"
        echo $BACKEND_PID > .pids/backend.pid
    else
        print_error "Failed to start backend service"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
else
    print_status "Backend service already running ✅"
fi

# Start Frontend Service (Next.js)
if [ "$FRONTEND_RUNNING" = false ]; then
    print_section "🎨 Starting Frontend Service"
    
    # Check if Node dependencies are installed
    if [ ! -d "frontend/node_modules" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
    
    print_status "Starting Next.js frontend service on port 3000..."
    cd frontend
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend service to be ready
    if wait_for_service "http://localhost:3000" "Frontend Service" 60; then
        print_status "Frontend service started successfully (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > .pids/frontend.pid
    else
        print_error "Failed to start frontend service"
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
else
    print_status "Frontend service already running ✅"
fi

print_section "✅ All Services Started Successfully!"

echo ""
echo "🌐 Service URLs:"
echo "   Frontend:      http://localhost:3000"
echo "   Backend API:   http://localhost:5001"
echo "   Summarization: http://localhost:8001"
echo ""
echo "📋 Service Status:"
curl -s http://localhost:8001/health | python3 -c "import json,sys; data=json.load(sys.stdin); print(f'   Summarization: {data.get(\"status\", \"unknown\")} (Model: {data.get(\"model_loaded\", False)})')" 2>/dev/null || echo "   Summarization: Unknown"
curl -s http://localhost:5001/health | python3 -c "import json,sys; data=json.load(sys.stdin); print(f'   Backend: {data.get(\"status\", \"unknown\")}')" 2>/dev/null || echo "   Backend: Unknown"
echo "   Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q 200 && echo "Running" || echo "Unknown")"
echo ""
echo "📁 Logs available in:"
echo "   logs/summarization.log"
echo "   logs/backend.log" 
echo "   logs/frontend.log"
echo ""
echo "🛑 To stop all services, run: ./scripts/stop-services.sh"