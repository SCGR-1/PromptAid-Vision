#!/bin/bash

# E2E Test Runner Script
set -e

echo "🚀 Starting E2E Test Suite for PromptAid Vision"

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

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Create test results directory
mkdir -p test-results/videos
mkdir -p test-results/screenshots
mkdir -p test-results/har

print_status "Setting up E2E test environment..."

# Start the E2E environment
print_status "Starting services with docker-compose..."
docker-compose -f docker-compose.e2e.yml up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check if services are healthy
print_status "Checking service health..."

# Check backend health
for i in {1..30}; do
    if curl -f http://localhost:7860/health > /dev/null 2>&1; then
        print_status "Backend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Backend health check failed"
        exit 1
    fi
    sleep 2
done

# Check frontend health
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Frontend health check failed"
        exit 1
    fi
    sleep 2
done

print_status "All services are ready!"

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Install Playwright browsers
print_status "Installing Playwright browsers..."
playwright install

# Run the tests
print_status "Running E2E tests..."
pytest -m e2e -v --tb=short

# Capture test results
TEST_EXIT_CODE=$?

# Generate test report
print_status "Generating test report..."
if [ -d "test-results" ]; then
    print_status "Test results available in test-results/ directory"
fi

# Cleanup
print_status "Cleaning up..."
docker-compose -f docker-compose.e2e.yml down -v

# Exit with test result
if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_status "✅ E2E tests completed successfully!"
else
    print_error "❌ E2E tests failed!"
fi

exit $TEST_EXIT_CODE
