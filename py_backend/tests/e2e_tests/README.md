# End-to-End Tests

This directory contains end-to-end tests for the PromptAid Vision backend. E2E tests verify complete user workflows and system behavior from start to finish.

## 🧪 Test Categories

### Complete User Workflow Tests
- **`test_upload_workflow.py`** - Complete file upload workflow from selection to storage
- **`test_crisis_analysis_workflow.py`** - Complete crisis analysis workflow
- **`test_admin_management_workflow.py`** - Complete admin management workflow
- **`test_data_export_workflow.py`** - Complete data export workflow

## 🚀 Running E2E Tests

### Run All E2E Tests
```bash
cd py_backend
python tests/e2e_tests/run_e2e_tests.py
```

### Run Individual Tests
```bash
cd py_backend
python tests/e2e_tests/test_upload_workflow.py
python tests/e2e_tests/test_crisis_analysis_workflow.py
```

## 📋 Test Requirements

- **Full backend server** must be running
- **Database** must be accessible and configured
- **All services** must be operational
- **External APIs** must be available (if testing integrations)
- **Test data** must be properly set up

## 🔧 Test Environment

E2E tests require the complete system to be running and configured. These tests simulate real user interactions and verify that the entire system works together correctly.

## 🎯 What E2E Tests Cover

- **Complete user journeys** from start to finish
- **Cross-component workflows** that span multiple services
- **Real data flows** through the entire system
- **User experience validation** end-to-end
- **System integration** under realistic conditions
