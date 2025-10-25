---
title: PromptAid Vision
emoji: 🚀
colorFrom: blue
colorTo: red
sdk: docker
sdk_version: "4.0.0"
app_file: app.py
pinned: false
---

# PromptAid Vision

An AI-powered platform for crisis mapping and drone image analysis.

## Overview

PromptAid Vision combines multiple AI vision models (GPT-4V, Gemini, Hugging Face) to analyze imagery for crisis response and humanitarian mapping. The platform provides automated image analysis, metadata extraction, and comprehensive reporting capabilities.

## Architecture

- **Frontend**: React + TypeScript with Tailwind CSS
- **Backend**: FastAPI + Python with PostgreSQL
- **AI Models**: Multi-model support with intelligent fallbacks
- **Storage**: Flexible local/S3 storage with image processing
- **Testing**: Unit, integration, and E2E test coverage

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 16+

### Development Setup

1. **Backend**
   ```bash
   cd py_backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --port 7860
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access**
   - Application: http://localhost:5173
   - API: http://localhost:7860
   - Documentation: http://localhost:7860/docs

## Deployment

### Local Production
```bash
cd frontend && npm run build
cd py_backend && uvicorn app.main:app --host 0.0.0.0 --port 7860
```

### Docker
```bash
docker-compose up --build
```

### Hugging Face Spaces
Automatically deployed via GitHub Actions workflow. Configure environment variables in Space settings.

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/promptaid
STORAGE_PROVIDER=local  # or s3
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_API_KEY=your-key
HUGGINGFACE_API_KEY=your-key
```

## Testing

```bash
# Backend
cd py_backend && python -m pytest tests/ -v

# Frontend
cd frontend && npm run test:unit

# E2E
cd e2e && ./run_e2e_tests.sh
```

## Project Structure

```
├── frontend/          # React frontend
├── py_backend/        # FastAPI backend
├── e2e/              # End-to-end tests
└── .github/workflows/ # CI/CD pipelines
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License