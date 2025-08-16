@echo off
echo 🚀 Starting PromptAid Vision Local Development Environment...
echo.

echo 1. Starting MinIO and PostgreSQL...
docker-compose up -d postgres minio

echo.
echo 2. Waiting for services to be ready...
timeout /t 15 /nobreak >nul

echo.
echo 3. Starting Backend on port 8000...
cd py_backend
call .venv\Scripts\activate
start "Backend" cmd /k "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo ✅ All Services Started:
echo    PostgreSQL: localhost:5434
echo    MinIO: localhost:9000
echo    MinIO Console: http://localhost:9001
echo    Backend: Port 8000
echo.
echo 🌐 URLs:
echo    Your App: http://localhost:8000/app/
echo    API Docs: http://localhost:8000/docs
echo    Health Check: http://localhost:8000/health
echo    MinIO Console: http://localhost:9001 (promptaid/promptaid)
echo.
echo 🎯 Main App URL: http://localhost:8000/app/
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo 🛑 Stopping all services...
docker-compose down
echo ✅ Services stopped.
