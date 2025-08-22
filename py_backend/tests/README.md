# PromptAid Vision Test Suite

This directory contains comprehensive tests for the PromptAid Vision application.

## 🧪 Test Structure

### Core Tests
- **`test_core.py`** - Core application functionality, database connections, and API endpoints
- **`test_config.py`** - Configuration and storage system tests

### API & Integration Tests
- **`test_upload_flow.py`** - Complete upload workflow testing
- **`test_openai_integration.py`** - OpenAI API integration tests
- **`test_admin_endpoints.py`** - Admin authentication and model management endpoints

### Schema Validation Tests
- **`test_schema_validation.py`** - Comprehensive schema validation and integration tests
  - Crisis map data validation
  - Drone image data validation
  - VLM response format handling
  - Admin schema management endpoints

### Frontend Tests
- **`test_explore_page.py`** - Frontend explore page functionality tests

## 🚀 Running Tests

### Run All Tests
```bash
cd py_backend
python tests/run_tests.py
```

### Run Individual Tests
```bash
cd py_backend
python tests/test_core.py
python tests/test_schema_validation.py
python tests/test_admin_endpoints.py
```

### Test Configuration
- Set `ADMIN_PASSWORD` environment variable for admin endpoint tests
- Ensure backend is running on `localhost:8000` for integration tests
- Update `BASE_URL` in test files if using different backend URL

## 📋 Test Categories

### ✅ **KEPT** (Relevant & Up-to-date)
- Core application tests
- Schema validation tests
- Admin endpoint tests
- Upload flow tests
- OpenAI integration tests
- Frontend tests

### 🗑️ **REMOVED** (Outdated/Redundant)
- ~~`test_hf.py`~~ - Old HuggingFace API tests (replaced by generic service)
- ~~`test_simple_validation.py`~~ - Simple validation (merged into comprehensive test)
- ~~`test_schema_integration.py`~~ - Schema integration (merged into validation test)
- ~~`run_tests_simple.py`~~ - Redundant test runner
- ~~`HUGGINGFACE_INTEGRATION.md`~~ - Outdated documentation
- ~~`TROUBLESHOOTING_HF.md`~~ - Outdated troubleshooting guide

## 🔧 Test Environment

- **Backend**: FastAPI application with PostgreSQL database
- **Frontend**: React application with IFRC UI components
- **APIs**: OpenAI, HuggingFace, and custom VLM services
- **Validation**: JSON schema validation for crisis maps and drone images

## 📊 Test Results

Tests provide detailed output including:
- ✅ Success indicators for passed tests
- ❌ Error details for failed tests
- 📋 Metadata about test execution
- ⏱️ Performance timing information
- 🔍 Detailed validation results

## 🚨 Troubleshooting

### Common Issues
1. **Import Errors**: Ensure you're running from the `py_backend` directory
2. **Database Connection**: Verify PostgreSQL is running and accessible
3. **API Keys**: Check environment variables for required API keys
4. **Backend Status**: Ensure FastAPI backend is running on expected port

### Getting Help
- Check test output for specific error messages
- Verify environment configuration
- Ensure all dependencies are installed
- Check backend logs for additional context 