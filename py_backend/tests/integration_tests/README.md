# Integration Tests

This directory contains integration tests for the PromptAid Vision backend. Integration tests verify that different components work together correctly.

## 🧪 Test Categories

### API Integration Tests
- **`test_core.py`** - Core application functionality, database connections, and API endpoints
- **`test_admin_endpoints.py`** - Admin authentication and model management endpoints
- **`test_schema_validation.py`** - Schema validation and integration tests
- **`test_explore_page.py`** - Frontend explore page functionality tests
- **`test_upload_flow.py`** - Complete upload workflow testing
- **`test_openai_integration.py`** - OpenAI API integration tests

## 🚀 Running Integration Tests

### Run All Integration Tests
```bash
cd py_backend
python tests/integration_tests/run_integration_tests.py
```

### Run Individual Tests
```bash
cd py_backend
python tests/integration_tests/test_core.py
python tests/integration_tests/test_admin_endpoints.py
```

## 📋 Test Requirements

- Backend server must be running
- Database must be accessible
- Environment variables must be configured
- External API keys (if testing external integrations)

## 🔧 Test Environment

Integration tests require a running backend environment to test actual component interactions.
