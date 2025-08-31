import pytest
import requests
import time
import os
from playwright.sync_api import sync_playwright

# Create test-results directories
os.makedirs("./test-results/videos/", exist_ok=True)
os.makedirs("./test-results/har/", exist_ok=True)

def pytest_configure(config):
    """Configure pytest for E2E tests"""
    config.addinivalue_line(
        "markers", "e2e: marks tests as end-to-end tests"
    )
    config.addinivalue_line(
        "markers", "upload: marks tests related to upload functionality"
    )
    config.addinivalue_line(
        "markers", "admin: marks tests related to admin functionality"
    )
    config.addinivalue_line(
        "markers", "export: marks tests related to export functionality"
    )

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context for E2E tests"""
    return {
        **browser_context_args,
        "viewport": {
            "width": 1920,
            "height": 1080,
        },
        "ignore_https_errors": True,
        "record_video_dir": "./test-results/videos/",
        "record_har_path": "./test-results/har/test.har",
    }

@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    """Configure browser launch arguments"""
    return {
        **browser_type_launch_args,
        "args": [
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ]
    }

@pytest.fixture(scope="session")
def wait_for_services():
    """Wait for all services to be ready before running tests"""
    print("Waiting for services to be ready...")
    
    # Wait for backend
    backend_ready = False
    for i in range(30):  # Wait up to 30 seconds
        try:
            response = requests.get("http://localhost:7860/health", timeout=5)
            if response.status_code == 200:
                backend_ready = True
                print("Backend is ready")
                break
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    
    if not backend_ready:
        pytest.fail("Backend service is not ready")
    
    # Wait for application (frontend served by backend)
    app_ready = False
    for i in range(30):  # Wait up to 30 seconds
        try:
            response = requests.get("http://localhost:7860", timeout=5)
            if response.status_code == 200:
                app_ready = True
                print("Application is ready")
                break
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    
    if not app_ready:
        pytest.fail("Application service is not ready")
    
    print("All services are ready!")

@pytest.fixture(scope="function")
def reset_test_data():
    """Reset test data between tests"""
    try:
        # Call the test reset endpoint if available
        response = requests.post("http://localhost:7860/test/reset", timeout=10)
        if response.status_code == 200:
            print("Test data reset successful")
        else:
            print("Test data reset failed, continuing anyway")
    except requests.exceptions.RequestException:
        print("Test reset endpoint not available, continuing anyway")
    
    yield

@pytest.fixture(scope="function")
def page(page, wait_for_services, reset_test_data):
    """Configure page for E2E tests"""
    # Set up page with proper viewport and other settings
    page.set_viewport_size({"width": 1920, "height": 1080})
    
    yield page
    
    # Video recording is handled automatically by Playwright
    # No manual start/stop needed

def pytest_runtest_setup(item):
    """Setup before each test"""
    # Ensure we're in the e2e directory
    os.chdir(os.path.dirname(__file__))

def pytest_runtest_teardown(item, nextitem):
    """Teardown after each test"""
    # Any cleanup needed after tests
    pass
