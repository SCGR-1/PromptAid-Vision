# PromptAid Vision Tests

This folder contains all test files for the PromptAid Vision application.

## Test Files

### Core Application Tests
- **`test_core.py`** - Core application functionality test
- **`test_hf.py`** - Hugging Face integration test

### Test Utilities
- **`test.jpg`** - Test image for image processing tests
- **`run_tests.py`** - Run all tests

## Running Tests

### Run All Tests
```bash
cd py_backend
python tests/run_tests.py
```

### Run Individual Tests
```bash
cd py_backend
python tests/test_core.py
python tests/test_hf.py
```

## Prerequisites

Before running the tests, ensure you have:

1. **Environment Variables Set**:
   ```bash
   cp .env.example .env
   ```

2. **Required API Keys**:
   - `HF_API_KEY` - Hugging Face API key
   - `OPENAI_API_KEY` - OpenAI API key (for GPT-4 Vision)
   - `GOOGLE_API_KEY` - Google API key (for Gemini Vision)

3. **Dependencies Installed**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Database Running**:
   - PostgreSQL database accessible
   - Environment variables for database connection

## Test Results

Tests will show:
- **SUCCESS** - Test completed successfully
- **ERROR** - Test encountered errors
- **TIMEOUT** - Test took too long
- **WARNING** - Unexpected error occurred

## Troubleshooting

### Common Issues
1. **Import Errors**: Tests automatically add the parent directory to Python path
2. **API Key Issues**: Ensure your API keys are valid and have proper permissions
3. **Database Connection**: Check database credentials and connection
4. **Timeout Issues**: Some tests may take longer on first run due to model loading

### Debug Mode

For detailed debugging, run individual tests directly:
```bash
python tests/test_core.py
```

### Logs

Check the console output for detailed error messages and debugging information.

## Adding New Tests

When adding new tests:

1. **Place in tests folder** with descriptive filename
2. **Update run_tests.py** to include the new test
3. **Fix imports** if importing from app modules
4. **Add to README** with description

## Related Documentation

- **`TROUBLESHOOTING_HF.md`** - Hugging Face API troubleshooting guide
- **`HUGGINGFACE_INTEGRATION.md`** - Hugging Face integration documentation 