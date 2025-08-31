# PromptAid Vision Test Suite

This directory contains comprehensive tests for the PromptAid Vision application, organized into two main categories.

## 🧪 Test Structure

### 📁 **Unit Tests** (`unit_tests/`)
Tests for individual components and functions in isolation:
- **`test_basic.py`** - Basic Python and unittest setup verification
- **`test_schema_validator.py`** - Schema validation service tests
- **`test_image_preprocessor.py`** - Image preprocessing service tests
- **`test_vlm_service.py`** - VLM service manager and stub service tests

### 🔗 **Integration Tests** (`integration_tests/`)
Tests for component interactions, API endpoints, and workflows:
- **`test_upload_flow.py`** - Complete upload workflow with database and API
- **`test_schema_validation.py`** - Schema validation integration tests
- **`test_admin_endpoints.py`** - Admin authentication and model management
- **`test_explore_page.py`** - Frontend explore page functionality
- **`test_openai_integration.py`** - OpenAI API integration tests
- **`test_config.py`** - Configuration and storage system tests
- **`test_core.py`** - Core application functionality tests
- **`test_crisis_analysis_workflow.py`** - Crisis analysis workflow integration tests
- **`test_admin_management_workflow.py`** - Admin management workflow integration tests
- **`test_data_export_workflow.py`** - Data export workflow integration tests

## 🚀 Running Tests

### Run All Tests
```bash
cd py_backend
python tests/run_tests.py
```

### Run Specific Test Categories
```bash
# Unit tests only
python tests/unit_tests/run_unit_tests.py

# Integration tests only
python tests/integration_tests/run_integration_tests.py
```

### Run Individual Test Files
```bash
cd py_backend
python tests/unit_tests/test_schema_validator.py
python tests/integration_tests/test_upload_flow.py
```

## 📋 Test Categories Summary

| Category | Count | Purpose | Location |
|----------|-------|---------|----------|
| **Unit Tests** | 4 | Test individual components | `unit_tests/` |
| **Integration Tests** | 10 | Test component interactions and workflows | `integration_tests/` |
| **Total** | **14** | Comprehensive test coverage | `tests/` |

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

### Test Configuration
- Set `ADMIN_PASSWORD` environment variable for admin endpoint tests
- Ensure backend is running on `localhost:8000` for integration tests
- Update `BASE_URL` in test files if using different backend URL

### Getting Help
- Check test output for specific error messages
- Verify environment configuration
- Ensure all dependencies are installed
- Check backend logs for additional context 