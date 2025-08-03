# Backend Tests

This directory contains comprehensive tests for the PromptAid Vision backend API.

## Test Files

### Core Tests
- **`test_upload.py`** - Database connection and CRUD operations test
- **`test_storage.py`** - S3/MinIO storage configuration and functionality test
- **`test_direct_upload.py`** - Direct upload process test (bypassing HTTP)
- **`test_full_upload.py`** - Full HTTP upload flow test
- **`test_upload_flow.py`** - Upload flow debugging test (API-based upload and list verification)
- **`test_explore_page.py`** - Explore page API endpoints and functionality test

### Test Runner
- **`run_tests.py`** - Main test runner that executes all tests and provides a summary

## Running Tests

### Run All Tests
```bash
cd py_backend
python tests/run_tests.py
```

### Run Individual Tests
```bash
cd py_backend
python tests/test_upload.py
python tests/test_storage.py
python tests/test_upload_flow.py
python tests/test_explore_page.py
```

### Prerequisites

1. **Database**: Ensure PostgreSQL is running and accessible
2. **MinIO/S3**: Ensure MinIO is running on localhost:9000
3. **FastAPI Server**: For HTTP tests, start the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Test Categories

### Database Tests
- Connection testing
- CRUD operations
- Relationship testing
- Data consistency

### Storage Tests
- S3/MinIO connection
- File upload functionality
- Presigned URL generation
- File serving

### API Tests
- Endpoint availability
- Request/response validation
- Error handling
- Data filtering

### Integration Tests
- Full upload workflow
- Explore page functionality
- Image serving
- Caption generation

## Test Data

Tests create temporary data and clean up after themselves. If tests fail unexpectedly, you may need to manually clean up:

```sql
-- Check for test data
SELECT * FROM images WHERE file_key LIKE '%test%';
SELECT * FROM captions WHERE title LIKE '%test%';

-- Clean up test data (if needed)
DELETE FROM captions WHERE title LIKE '%test%';
DELETE FROM images WHERE file_key LIKE '%test%';
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL in environment

2. **Storage Connection Failed**
   - Check if MinIO is running on localhost:9000
   - Verify S3 credentials in environment

3. **HTTP Tests Failing**
   - Ensure FastAPI server is running on localhost:8000
   - Check for port conflicts

4. **Import Errors**
   - Ensure you're running from the `py_backend` directory
   - Check that all dependencies are installed

### Debug Mode

To run tests with more verbose output, modify the test files to include additional logging or run with Python's verbose flag:

```bash
python -v tests/test_upload.py
``` 