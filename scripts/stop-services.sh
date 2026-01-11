#!/bin/bash

# Stop script for all Elevare services
# This script stops all running services gracefully

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

print_status "🛑 Stopping Elevare Services..."

# Create directories if they don't exist
mkdir -p .pids
mkdir -p logs

# Function to stop service by PID file
stop_service_by_pid() {
    local service_name=$1
    local pid_file=".pids/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill "$pid"
            
            # Wait for process to stop
            local counter=0
            while kill -0 "$pid" 2>/dev/null && [ $counter -lt 10 ]; do
                sleep 1
                counter=$((counter + 1))
            done
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Force killing $service_name..."
                kill -9 "$pid" 2>/dev/null || true
            fi
            
            print_status "$service_name stopped ✅"
        else
            print_warning "$service_name PID file exists but process not running"
        fi
        rm -f "$pid_file"
    else
        print_warning "No PID file found for $service_name"
    fi
}

# Function to stop service by port
stop_service_by_port() {
    local service_name=$1
    local port=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        print_status "Stopping $service_name on port $port (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        
        # Wait for process to stop
        sleep 2
        
        # Force kill if still running
        local still_running=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$still_running" ]; then
            print_warning "Force killing $service_name..."
            kill -9 "$still_running" 2>/dev/null || true
        fi
        
        print_status "$service_name stopped ✅"
    else
        print_status "$service_name not running on port $port"
    fi
}

# Stop services by PID files first
stop_service_by_pid "summarization"
stop_service_by_pid "backend" 
stop_service_by_pid "frontend"

# Stop any remaining services by port (fallback)
print_status "Checking for remaining services on ports..."
stop_service_by_port "Summarization Service" 8001
stop_service_by_port "Backend Service" 3001
stop_service_by_port "Frontend Service" 3000

# Stop any Node.js processes that might be related
print_status "Cleaning up any remaining Node.js processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

# Stop any Python processes that might be related
print_status "Cleaning up any remaining Python processes..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "python.*summarization" 2>/dev/null || true

# Clean up PID files
rm -f .pids/*.pid

print_status "✅ All services stopped!"

# Show final status
echo ""
echo "🔍 Final port status:"
echo "   Port 3000 (Frontend): $(lsof -ti:3000 >/dev/null 2>&1 && echo "Still in use ⚠️" || echo "Free ✅")"
echo "   Port 3001 (Backend):  $(lsof -ti:3001 >/dev/null 2>&1 && echo "Still in use ⚠️" || echo "Free ✅")"
echo "   Port 8001 (Summarization): $(lsof -ti:8001 >/dev/null 2>&1 && echo "Still in use ⚠️" || echo "Free ✅")"