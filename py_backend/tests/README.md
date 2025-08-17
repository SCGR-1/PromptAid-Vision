# PromptAid Vision Test Suite

This directory contains comprehensive tests for the PromptAid Vision application.

## Test Organization

### Core Functionality Tests
- **`test_core.py`** - Core application functionality, database operations, and basic API endpoints
- **`test_config.py`** - Configuration validation and storage setup verification

### API and Integration Tests
- **`test_upload_flow.py`** - Complete image upload workflow testing
- **`test_openai_integration.py`** - OpenAI GPT-4 Vision API integration tests
- **`test_hf.py`** - Hugging Face Spaces deployment and integration tests

### Frontend and UI Tests
- **`test_explore_page.py`** - Frontend explore page functionality and data display

## Running Tests

### Run All Tests
```bash
cd py_backend
python tests/run_tests.py
```

### Run Individual Tests
```bash
cd py_backend
python tests/test_config.py          # Test configuration
python tests/test_core.py           # Test core functionality
python tests/test_upload_flow.py    # Test upload flow
python tests/test_openai_integration.py  # Test OpenAI integration
python tests/test_hf.py             # Test Hugging Face integration
python tests/test_explore_page.py   # Test explore page
```

### Test Configuration
```bash
# Test storage configuration
python tests/test_config.py
```

## Test Dependencies

- **Database**: Tests use a test SQLite database
- **External APIs**: Some tests require API keys (OpenAI, Hugging Face)
- **Storage**: Tests verify both local and S3 storage configurations

## Test Data

- **`test.jpg`** - Sample image file for testing uploads and image processing

## Troubleshooting

See `TROUBLESHOOTING_HF.md` for common Hugging Face deployment issues.

## Adding New Tests

1. Create test file in this directory
2. Follow naming convention: `test_*.py`
3. Add to `run_tests.py` in appropriate category
4. Ensure tests can run independently
5. Include proper error handling and cleanup 