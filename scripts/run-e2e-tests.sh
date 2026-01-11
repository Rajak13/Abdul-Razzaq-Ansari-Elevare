#!/bin/bash

# End-to-End Testing Pipeline for PEGASUS Summarization Integration
# This script sets up the complete test environment and runs all tests

set -e  # Exit on any error

echo "🚀 Starting PEGASUS Summarization E2E Test Pipeline"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install it and try again."
    exit 1
fi

# Clean up any existing containers
print_status "Cleaning up existing test containers..."
docker-compose -f docker-compose.test.yml down --volumes --remove-orphans || true

# Build test images
print_status "Building test images..."
docker-compose -f docker-compose.test.yml build

# Start the test environment
print_status "Starting test environment..."
docker-compose -f docker-compose.test.yml up -d test-db

# Wait for database to be ready
print_status "Waiting for database to be ready..."
timeout=60
counter=0
while ! docker-compose -f docker-compose.test.yml exec -T test-db pg_isready -U test_user -d elevare_test > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Database failed to start within $timeout seconds"
        docker-compose -f docker-compose.test.yml logs test-db
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_status "Database is ready!"

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.test.yml exec -T test-db psql -U test_user -d elevare_test -f /docker-entrypoint-initdb.d/20241126000001_create_users_table.sql || true
docker-compose -f docker-compose.test.yml exec -T test-db psql -U test_user -d elevare_test -f /docker-entrypoint-initdb.d/20241126000003_create_notes_tables.sql || true
docker-compose -f docker-compose.test.yml exec -T test-db psql -U test_user -d elevare_test -f /docker-entrypoint-initdb.d/20250109000001_add_summary_fields_to_notes.sql || true

# Start backend service
print_status "Starting backend service..."
docker-compose -f docker-compose.test.yml up -d backend-test

# Wait for backend to be ready
print_status "Waiting for backend service..."
timeout=60
counter=0
while ! curl -f http://localhost:3001/health > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Backend service failed to start within $timeout seconds"
        docker-compose -f docker-compose.test.yml logs backend-test
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_status "Backend service is ready!"

# Start summarization service
print_status "Starting summarization service..."
docker-compose -f docker-compose.test.yml up -d summarization-test

# Wait for summarization service to be ready
print_status "Waiting for summarization service..."
timeout=120  # Longer timeout for model loading
counter=0
while ! curl -f http://localhost:8001/health > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Summarization service failed to start within $timeout seconds"
        docker-compose -f docker-compose.test.yml logs summarization-test
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
done

print_status "Summarization service is ready!"

# Start frontend service
print_status "Starting frontend service..."
docker-compose -f docker-compose.test.yml up -d frontend-test

# Wait for frontend to be ready
print_status "Waiting for frontend service..."
timeout=60
counter=0
while ! curl -f http://localhost:3000 > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Frontend service failed to start within $timeout seconds"
        docker-compose -f docker-compose.test.yml logs frontend-test
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_status "Frontend service is ready!"

# Run unit tests for all services
print_status "Running unit tests..."

print_status "Running backend unit tests..."
docker-compose -f docker-compose.test.yml exec -T backend-test npm test || {
    print_error "Backend unit tests failed"
    exit 1
}

print_status "Running summarization service tests..."
docker-compose -f docker-compose.test.yml exec -T summarization-test python -m pytest -v || {
    print_error "Summarization service tests failed"
    exit 1
}

print_status "Running frontend unit tests..."
docker-compose -f docker-compose.test.yml exec -T frontend-test npm run test || {
    print_error "Frontend unit tests failed"
    exit 1
}

# Run end-to-end tests
print_status "Running end-to-end tests..."
docker-compose -f docker-compose.test.yml --profile e2e up --abort-on-container-exit e2e-tests || {
    print_error "End-to-end tests failed"
    docker-compose -f docker-compose.test.yml logs e2e-tests
    exit 1
}

# Generate test reports
print_status "Generating test reports..."
mkdir -p test-reports

# Copy test results from containers
docker-compose -f docker-compose.test.yml exec -T backend-test cp -r coverage test-reports/backend-coverage || true
docker-compose -f docker-compose.test.yml exec -T frontend-test cp -r coverage test-reports/frontend-coverage || true
docker-compose -f docker-compose.test.yml exec -T frontend-test cp -r playwright-report test-reports/e2e-report || true

print_status "✅ All tests completed successfully!"
print_status "Test reports available in ./test-reports/"

# Cleanup
print_status "Cleaning up test environment..."
docker-compose -f docker-compose.test.yml down --volumes

print_status "🎉 E2E Test Pipeline completed successfully!"