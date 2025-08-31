import pytest
from playwright.sync_api import Page

class TestBasicE2E:
    """Basic E2E tests to verify setup"""
    
    @pytest.mark.e2e
    def test_page_loads(self, page: Page):
        """Test that the page loads"""
        page.goto("http://localhost:7860")
        assert page.title() is not None
    
    @pytest.mark.e2e
    def test_health_endpoint(self, page: Page):
        """Test health endpoint"""
        response = page.goto("http://localhost:7860/health")
        assert response.status == 200
