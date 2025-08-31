---
title: PromptAid Vision
emoji: 🚀
colorFrom: blue
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# PromptAid Vision

A comprehensive vision analysis platform for crisis mapping and drone image processing.

## Testing

### Frontend Tests
- **Unit Tests**: `frontend/src/test/unit_tests/` - Component and hook testing with Vitest
- **Integration Tests**: `frontend/src/test/integration/` - Component interaction testing

### Backend Tests
- **Unit Tests**: `py_backend/tests/unit_tests/` - Individual service testing
- **Integration Tests**: `py_backend/tests/integration_tests/` - API and workflow testing

### End-to-End Tests
- **E2E Tests**: `e2e/` - Complete user workflow testing with Playwright
- **CI/CD**: `.github/workflows/e2e.yml` - Automated E2E testing pipeline

## Quick Start

### Development
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd py_backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Testing
```bash
# Frontend tests
cd frontend
npm run test:unit
npm run test:integration

# Backend tests
cd py_backend
python -m pytest tests/

# E2E tests
cd e2e
./run_e2e_tests.sh
```

## Project Structure
```
├── frontend/                 # React + TypeScript
├── py_backend/              # FastAPI + Python
├── e2e/                     # End-to-end tests
└── .github/workflows/       # CI/CD pipelines
```
