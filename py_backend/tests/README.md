# PromptAid Vision Test Suite

This directory contains comprehensive tests for the PromptAid Vision application.

## Test Files

### Core Tests

- **`test_basic.py`** - Basic application health checks using pytest
  - Tests if the FastAPI app exists and is accessible
  - Basic endpoint availability

- **`test_api_endpoints.py`** - Comprehensive API endpoint testing
  - Tests `/api/images/` endpoint and data structure
  - Tests all filter endpoints (`/api/sources`, `/api/types`, `/api/regions`, `/api/countries`)
  - Tests metadata update functionality
  - Validates response formats and required fields

- **`test_upload_flow.py`** - Complete upload workflow testing
  - Database connection and CRUD function tests
  - Complete upload flow: upload → create caption → submit caption
  - Deletion logic testing (ensures images are only deleted when appropriate)
  - Database consistency checks

- **`test_database_operations.py`** - Database and connectivity testing
  - Frontend-backend connection tests
  - Database save verification (ensures data is actually saved)
  - Submit flow simulation (like frontend behavior)
  - Database consistency and relationship checks
  - Specific caption existence verification

- **`test_explore_page.py`** - Explore page functionality testing
  - Tests the explore page data loading
  - Filter functionality testing
  - Search functionality testing
  - UI component integration tests

## Running Tests

### Run All Tests
```bash
cd py_backend
python tests/run_tests.py
```

### Run Individual Tests
```bash
cd py_backend
python tests/test_api_endpoints.py
python tests/test_upload_flow.py
python tests/test_database_operations.py
python tests/test_explore_page.py
```

### Run Basic Health Check
```bash
cd py_backend
python tests/test_basic.py
```

## Test Categories

### 1. **API Endpoints** (`test_api_endpoints.py`)
- **Purpose**: Verify all API endpoints work correctly
- **Tests**: Images endpoint, filter endpoints, metadata updates
- **Validation**: Response formats, data structures, error handling

### 2. **Upload Flow** (`test_upload_flow.py`)
- **Purpose**: Test the complete upload workflow
- **Tests**: Database operations, CRUD functions, upload → caption → submit
- **Validation**: Data persistence, deletion logic, workflow integrity

### 3. **Database Operations** (`test_database_operations.py`)
- **Purpose**: Verify database connectivity and data integrity
- **Tests**: Frontend-backend connection, data saving, submit flow simulation
- **Validation**: Database consistency, relationship integrity, data persistence

### 4. **Explore Page** (`test_explore_page.py`)
- **Purpose**: Test explore page functionality
- **Tests**: Data loading, filtering, searching, UI components
- **Validation**: User interface functionality, data display, interaction

### 5. **Basic Health** (`test_basic.py`)
- **Purpose**: Basic application health checks
- **Tests**: App existence, basic endpoint availability
- **Validation**: Application startup and basic functionality

## Test Dependencies

- **FastAPI Server**: Must be running on `http://localhost:8080`
- **Database**: PostgreSQL database must be accessible
- **MinIO/S3**: Object storage must be configured
- **Python Packages**: `requests`, `pytest`, `sqlalchemy`

## Test Environment

Tests expect the following environment:
- Backend server running on port 8080
- Database with proper schema and lookup data
- Object storage configured and accessible
- All required Python dependencies installed

## Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   Start the server: uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

2. **Database Connection Issues**
   ```
   Check database configuration in app/database.py
   Ensure PostgreSQL is running and accessible
   ```

3. **Import Errors**
   ```
   Ensure you're running tests from the py_backend directory
   Check that all dependencies are installed
   ```

4. **Timeout Errors**
   ```
   Some tests may take time for file uploads
   Increase timeout in run_tests.py if needed
   ```

## Test Output

Tests provide detailed output including:
- ✅ Success indicators
- ❌ Failure indicators with error details
- 📊 Summary statistics
- ⏱️ Execution time tracking

## Maintenance

When adding new features:
1. Add tests to appropriate existing test files
2. Create new test files only for completely new functionality
3. Update this README with new test descriptions
4. Ensure all tests pass before merging changes 