# End-to-End Test Suite for PromptAid Vision

This directory contains comprehensive end-to-end tests that validate the complete user experience through the entire application stack.

## 🎯 Overview

These are **true E2E tests** that:
- ✅ Hit the running app over HTTP via real browsers
- ✅ Test complete user workflows from start to finish
- ✅ Validate frontend, backend, and database integration
- ✅ Use real browser automation with Playwright
- ✅ Run against containerized services

## 🏗️ Architecture

```
e2e/
├── docker-compose.e2e.yml    # E2E environment setup
├── requirements.txt          # Python dependencies
├── pytest.ini              # Pytest configuration
├── conftest.py             # Test fixtures and setup
├── run_e2e_tests.sh        # Test runner script
├── pages/                  # Page Object Models
│   ├── base_page.py
│   ├── upload_page.py
│   ├── explore_page.py
│   └── admin_page.py
├── specs/                  # Test specifications
│   ├── upload_flow_spec.py
│   ├── admin_settings_spec.py
│   └── export_spec.py
└── fixtures/              # Test data
    └── test_image.jpg
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.8+
- Git

### Run E2E Tests

```bash
# Option 1: Use the automated script
chmod +x run_e2e_tests.sh
./run_e2e_tests.sh

# Option 2: Manual steps
docker-compose -f docker-compose.e2e.yml up -d --build
pip install -r requirements.txt
playwright install
pytest -m e2e -v
docker-compose -f docker-compose.e2e.yml down -v
```

## 🧪 Test Categories

### 1. Upload Flow Tests (`upload_flow_spec.py`)
- **Complete upload workflow**: File selection → Analysis → Success
- **Invalid file handling**: Error messages for wrong file types
- **Large file handling**: Performance with large images

### 2. Admin Settings Tests (`admin_settings_spec.py`)
- **Authentication flow**: Login/logout with correct/incorrect credentials
- **Schema management**: Admin interface for schema configuration
- **Model configuration**: VLM service configuration
- **System monitoring**: Health checks and monitoring

### 3. Export Tests (`export_spec.py`)
- **Filtered data export**: Export with applied filters
- **Bulk export workflow**: Export multiple selected items
- **Export format validation**: Different export formats
- **Performance testing**: Export with large datasets

## 🔧 Environment Setup

### Docker Services
- **PostgreSQL 16**: Test database with health checks
- **MinIO**: S3-compatible storage for file uploads
- **Backend**: FastAPI with mock VLM provider
- **Frontend**: React application with Vite

### Health Checks
- Backend: `http://localhost:7860/health`
- Frontend: `http://localhost:3000`
- Database: PostgreSQL connection check
- MinIO: S3 health endpoint

## 📊 Test Metrics

### What We Measure
- **Flakiness rate**: Test stability and reliability
- **Test duration**: Median and 95th percentile times
- **Critical path coverage**: Key user workflows
- **Failure triage speed**: Debug information availability

### What We Don't Measure
- ❌ Code coverage (not relevant for E2E)
- ❌ Individual test duration targets
- ❌ UI element coverage percentages

## 🎭 Playwright Configuration

### Browser Settings
- **Viewport**: 1920x1080
- **Video recording**: Enabled for all tests
- **Screenshots**: On failure
- **Traces**: Available for debugging

### Auto-wait Strategy
- No explicit `sleep()` calls
- Uses Playwright's built-in auto-wait
- Relies on `expect().toBeVisible()` assertions
- URL-based navigation verification

## 📁 Test Data Management

### Data Isolation
- **Per-test reset**: `/test/reset` endpoint (E2E mode only)
- **Volume cleanup**: `docker-compose down -v` after suite
- **Namespaced data**: Unique filenames per test

### Test Fixtures
- Sample images for upload testing
- Test schemas for validation
- Mock data for various scenarios

## 🚨 Troubleshooting

### Common Issues

1. **Services not ready**
   ```bash
   # Check service health
   curl http://localhost:7860/health
   curl http://localhost:3000
   ```

2. **Browser installation issues**
   ```bash
   # Reinstall Playwright browsers
   playwright install
   ```

3. **Test failures with traces**
   ```bash
   # View test traces
   playwright show-trace test-results/trace.zip
   ```

### Debug Mode
```bash
# Run tests with headed browser
pytest -m e2e --headed --slowmo=1000

# Run specific test with debugging
pytest specs/upload_flow_spec.py::TestUploadFlow::test_complete_upload_flow -v --headed
```

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Start E2E environment
        run: docker-compose -f e2e/docker-compose.e2e.yml up -d --build
      - name: Wait for services
        run: sleep 30
      - name: Install dependencies
        run: |
          cd e2e
          pip install -r requirements.txt
          playwright install
      - name: Run E2E tests
        run: |
          cd e2e
          pytest -m e2e -v
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: e2e/test-results/
```

## 📋 Test Results

### Output Locations
- **Videos**: `test-results/videos/`
- **Screenshots**: `test-results/screenshots/`
- **Traces**: `test-results/har/`
- **Reports**: Playwright HTML report

### Success Criteria
- All critical user paths covered
- <5% flakiness rate
- <5 minutes total suite duration
- Clear failure debugging information

## 🔄 Maintenance

### Regular Tasks
- Update test selectors when UI changes
- Refresh test data periodically
- Monitor flakiness trends
- Update dependencies

### Best Practices
- Use stable `data-testid` selectors
- Keep page objects thin and focused
- Write descriptive test names
- Maintain test data isolation
