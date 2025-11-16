.PHONY: help install dev dev-backend dev-frontend build start stop clean test test-backend test-frontend test-e2e migrate migrate-create migrate-upgrade migrate-downgrade docker-up docker-down docker-build docker-clean

# Default target
.DEFAULT_GOAL := help

# Variables
PYTHON := python
PIP := pip
NPM := npm
VENV := py_backend/.venv
VENV_BIN := $(VENV)/bin
VENV_ACTIVATE := $(VENV_BIN)/activate
VENV_PYTHON := $(VENV_BIN)/python
BACKEND_DIR := py_backend
FRONTEND_DIR := frontend

# Detect OS for virtual environment activation
ifeq ($(OS),Windows_NT)
	VENV_ACTIVATE := $(VENV)/Scripts/activate
	VENV_PYTHON := $(VENV)/Scripts/python
	VENV_PIP := $(VENV)/Scripts/pip
	SLEEP := timeout /t
	RM := del /s /q
	RMDIR := rmdir /s /q
	MKDIR := if not exist
	TEST_DIR := if not exist
else
	VENV_PIP := $(VENV_BIN)/pip
	SLEEP := sleep
	RM := rm -rf
	RMDIR := rm -rf
	MKDIR := mkdir -p
	TEST_DIR := test -d
endif

##@ Help

help: ## Display this help message
	@echo "PromptAid Vision - Makefile Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

##@ Installation

install: install-backend install-frontend ## Install all dependencies (backend + frontend)

install-backend: ## Install backend Python dependencies
	@echo "📦 Installing backend dependencies..."
ifeq ($(OS),Windows_NT)
	@if not exist "$(VENV)" ( \
		echo Creating virtual environment... && \
		cd $(BACKEND_DIR) && $(PYTHON) -m venv .venv \
	)
else
	@if [ ! -d "$(VENV)" ]; then \
		echo "Creating virtual environment..."; \
		cd $(BACKEND_DIR) && $(PYTHON) -m venv .venv; \
	fi
endif
	@echo "Installing Python packages..."
	@$(VENV_PIP) install -r $(BACKEND_DIR)/requirements.txt
	@echo "✅ Backend dependencies installed"

install-frontend: ## Install frontend Node.js dependencies
	@echo "📦 Installing frontend dependencies..."
	@cd $(FRONTEND_DIR) && $(NPM) install
	@echo "✅ Frontend dependencies installed"

##@ Development

dev: docker-up install ## Start full development environment (docker + backend + frontend)
	@echo "🚀 Starting development environment..."
	@echo "Waiting for services to be ready..."
ifeq ($(OS),Windows_NT)
	@timeout /t 5 /nobreak >nul
	@echo "Starting backend..."
	@start "Backend" cmd /k "cd /d $(BACKEND_DIR) && $(VENV_PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
	@echo "Starting frontend..."
	@start "Frontend" cmd /k "cd /d $(FRONTEND_DIR) && $(NPM) run dev"
else
	@sleep 5
	@echo "Starting backend..."
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
	@echo "Starting frontend..."
	@cd $(FRONTEND_DIR) && $(NPM) run dev &
endif
	@echo ""
	@echo "✅ Development environment started!"
	@echo "   Backend: http://localhost:8000"
	@echo "   Frontend: http://localhost:5173"
	@echo "   API Docs: http://localhost:8000/docs"
	@echo "   MinIO Console: http://localhost:9001 (promptaid/promptaid)"

dev-backend: docker-up ## Start only backend development server
	@echo "🚀 Starting backend..."
ifeq ($(OS),Windows_NT)
	@if not exist "$(VENV)" ( \
		echo Virtual environment not found. Run 'make install-backend' first. && \
		exit /b 1 \
	)
	@echo "Waiting for services to be ready..."
	@timeout /t 5 /nobreak >nul
else
	@if [ ! -d "$(VENV)" ]; then \
		echo "Virtual environment not found. Run 'make install-backend' first."; \
		exit 1; \
	fi
	@echo "Waiting for services to be ready..."
	@sleep 5
endif
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start only frontend development server
	@echo "🚀 Starting frontend..."
	@cd $(FRONTEND_DIR) && $(NPM) run dev

##@ Building

build: build-frontend ## Build frontend for production
	@echo "✅ Build complete"

build-frontend: ## Build frontend production bundle
	@echo "🏗️  Building frontend..."
	@cd $(FRONTEND_DIR) && $(NPM) run build
	@echo "✅ Frontend build complete"

##@ Docker

docker-up: ## Start Docker services (PostgreSQL, MinIO)
	@echo "🐳 Starting Docker services..."
	@docker-compose up -d postgres minio
	@echo "✅ Docker services started"
	@echo "   PostgreSQL: localhost:5434"
	@echo "   MinIO: localhost:9000"
	@echo "   MinIO Console: http://localhost:9001"

docker-down: ## Stop Docker services
	@echo "🛑 Stopping Docker services..."
	@docker-compose down
	@echo "✅ Docker services stopped"

docker-build: ## Build Docker images
	@echo "🏗️  Building Docker images..."
	@docker-compose build
	@echo "✅ Docker images built"

docker-clean: docker-down ## Stop Docker services and remove volumes
	@echo "🧹 Cleaning Docker volumes..."
	@docker-compose down -v
	@echo "✅ Docker volumes removed"

##@ Database

migrate: migrate-upgrade ## Run database migrations (alias for migrate-upgrade)

migrate-create: ## Create a new database migration
	@echo "📝 Creating new migration..."
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m alembic revision --autogenerate -m "$(MSG)"
	@echo "✅ Migration created"

migrate-upgrade: ## Apply all pending migrations
	@echo "⬆️  Applying database migrations..."
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m alembic upgrade head
	@echo "✅ Migrations applied"

migrate-downgrade: ## Rollback last migration
	@echo "⬇️  Rolling back last migration..."
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m alembic downgrade -1
	@echo "✅ Migration rolled back"

migrate-history: ## Show migration history
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m alembic history

migrate-current: ## Show current migration version
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m alembic current

##@ Testing

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	@echo "🧪 Running backend tests..."
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m pytest tests/ -v
	@echo "✅ Backend tests complete"

test-frontend: ## Run frontend tests
	@echo "🧪 Running frontend tests..."
	@cd $(FRONTEND_DIR) && $(NPM) run test:run
	@echo "✅ Frontend tests complete"

test-frontend-watch: ## Run frontend tests in watch mode
	@cd $(FRONTEND_DIR) && $(NPM) run test

test-frontend-unit: ## Run frontend unit tests only
	@cd $(FRONTEND_DIR) && $(NPM) run test:unit

test-frontend-integration: ## Run frontend integration tests only
	@cd $(FRONTEND_DIR) && $(NPM) run test:integration

test-e2e: ## Run end-to-end tests
	@echo "🧪 Running E2E tests..."
	@cd e2e && ./run_e2e_tests.sh
	@echo "✅ E2E tests complete"

##@ Linting

lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Lint backend code
	@echo "🔍 Linting backend..."
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m flake8 app/ || echo "⚠️  flake8 not installed, skipping..."
	@echo "✅ Backend linting complete"

lint-frontend: ## Lint frontend code
	@echo "🔍 Linting frontend..."
	@cd $(FRONTEND_DIR) && $(NPM) run lint
	@echo "✅ Frontend linting complete"

##@ Cleanup

clean: clean-backend clean-frontend ## Clean all build artifacts and caches

clean-backend: ## Clean backend artifacts (__pycache__, .pyc files)
	@echo "🧹 Cleaning backend artifacts..."
ifeq ($(OS),Windows_NT)
	@for /d /r $(BACKEND_DIR) %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
	@for /r $(BACKEND_DIR) %%f in (*.pyc) do @if exist "%%f" del /q "%%f" 2>nul
	@for /r $(BACKEND_DIR) %%f in (*.pyo) do @if exist "%%f" del /q "%%f" 2>nul
else
	@find $(BACKEND_DIR) -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	@find $(BACKEND_DIR) -type f -name "*.pyc" -delete 2>/dev/null || true
	@find $(BACKEND_DIR) -type f -name "*.pyo" -delete 2>/dev/null || true
endif
	@echo "✅ Backend cleaned"

clean-frontend: ## Clean frontend build artifacts and node_modules
	@echo "🧹 Cleaning frontend artifacts..."
ifeq ($(OS),Windows_NT)
	@if exist "$(FRONTEND_DIR)\dist" rmdir /s /q "$(FRONTEND_DIR)\dist" 2>nul
	@if exist "$(FRONTEND_DIR)\node_modules\.vite" rmdir /s /q "$(FRONTEND_DIR)\node_modules\.vite" 2>nul
else
	@cd $(FRONTEND_DIR) && rm -rf dist node_modules/.vite 2>/dev/null || true
endif
	@echo "✅ Frontend cleaned"

clean-all: clean docker-clean ## Clean everything including Docker volumes and node_modules
	@echo "🧹 Deep cleaning..."
ifeq ($(OS),Windows_NT)
	@if exist "$(FRONTEND_DIR)\node_modules" rmdir /s /q "$(FRONTEND_DIR)\node_modules" 2>nul
	@if exist "$(VENV)" rmdir /s /q "$(VENV)" 2>nul
else
	@rm -rf $(FRONTEND_DIR)/node_modules 2>/dev/null || true
	@rm -rf $(VENV) 2>/dev/null || true
endif
	@echo "✅ Deep clean complete"

##@ Production

start: docker-up build-frontend ## Start production environment
	@echo "🚀 Starting production environment..."
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000
	@echo "✅ Production server started"

stop: docker-down ## Stop all services
	@echo "🛑 Stopping all services..."
	@echo "✅ All services stopped"

##@ Utilities

shell-backend: ## Open Python shell with backend context
	@cd $(BACKEND_DIR) && $(VENV_PYTHON)

check: ## Check system requirements
	@echo "🔍 Checking system requirements..."
	@echo "Python: $$($(PYTHON) --version 2>&1 || echo 'Not found')"
	@echo "Node.js: $$($(NPM) --version 2>&1 || echo 'Not found')"
	@echo "Docker: $$(docker --version 2>&1 || echo 'Not found')"
	@echo "Docker Compose: $$(docker-compose --version 2>&1 || echo 'Not found')"

status: ## Show status of services
	@echo "📊 Service Status:"
	@docker-compose ps
	@echo ""
ifeq ($(OS),Windows_NT)
	@if exist "$(VENV)" (echo Backend virtual environment: ✅ Installed) else (echo Backend virtual environment: ❌ Not installed)
	@if exist "$(FRONTEND_DIR)\node_modules" (echo Frontend node_modules: ✅ Installed) else (echo Frontend node_modules: ❌ Not installed)
else
	@echo "Backend virtual environment: $$([ -d '$(VENV)' ] && echo '✅ Installed' || echo '❌ Not installed')"
	@echo "Frontend node_modules: $$([ -d '$(FRONTEND_DIR)/node_modules' ] && echo '✅ Installed' || echo '❌ Not installed')"
endif

