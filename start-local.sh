#!/bin/bash
echo "🚀 Starting PromptAid Vision Local Development Environment..."
echo ""

echo "1. Starting MinIO and PostgreSQL..."
docker-compose up -d postgres minio

echo ""
echo "2. Waiting for services to be ready..."
sleep 15

echo ""
echo "3. Starting Backend on port 8000..."
cd py_backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo ""
echo "✅ All Services Started:"
echo "   PostgreSQL: localhost:5434"
echo "   MinIO: localhost:9000"
echo "   MinIO Console: http://localhost:9001"
echo "   Backend PID: $BACKEND_PID (Port 8000)"
echo ""
echo "🌐 URLs:"
echo "   Your App: http://localhost:8000/app/"
echo "   API Docs: http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/health"
echo "   MinIO Console: http://localhost:9001 (promptaid/promptaid)"
echo ""
echo "🎯 Main App URL: http://localhost:8000/app/"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    docker-compose down
    kill $BACKEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM EXIT

# Wait for both processes
wait
