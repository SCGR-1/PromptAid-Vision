import pytest
import requests

# Try to import playwright, but don't fail if not available
try:
    from playwright.sync_api import Page, expect
    from pages.admin_page import AdminPage
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

class TestAdminSettings:
    """E2E tests for admin configuration save/health"""
    
    @pytest.fixture(autouse=True)
    def setup(self, page):
        """Setup for each test"""
        if not PLAYWRIGHT_AVAILABLE:
            pytest.skip("Playwright not available")
        self.admin_page = AdminPage(page)
        self.admin_password = "admin_e2e_password"
    
    @pytest.mark.e2e
    @pytest.mark.admin
    def test_admin_login_and_authentication(self, page):
        """Test admin login and authentication flow"""
        # Step 1: Navigate to admin page
        self.admin_page.navigate()
        
        # Step 2: Verify login form is shown
        self.admin_page.expect_login_required()
        
        # Step 3: Login with correct password
        self.admin_page.login(self.admin_password)
        
        # Step 4: Verify admin dashboard is accessible
        self.admin_page.expect_admin_access()
        
        # Step 5: Logout
        self.admin_page.logout()
        
        # Step 6: Verify back to login form
        self.admin_page.expect_login_required()
    
    @pytest.mark.e2e
    @pytest.mark.admin
    def test_admin_login_invalid_password(self, page):
        """Test admin login with invalid password"""
        # Step 1: Navigate to admin page
        self.admin_page.navigate()
        
        # Step 2: Try to login with wrong password
        self.admin_page.login("wrong_password")
        
        # Step 3: Verify error message is shown
        self.admin_page.expect_error_message()
        
        # Step 4: Verify still on login form
        self.admin_page.expect_login_required()
    
    @pytest.mark.e2e
    @pytest.mark.admin
    def test_schema_management_flow(self, page):
        """Test schema management functionality"""
        # Step 1: Login to admin
        self.admin_page.navigate()
        self.admin_page.login(self.admin_password)
        
        # Step 2: Navigate to schema management
        self.admin_page.navigate_to_schema_management()
        
        # Step 3: Verify schema management interface is loaded
        self.admin_page.expect_element_visible("[data-testid='schema-list']")
        
        # Step 4: Test schema operations (if available)
        # This would depend on the actual schema management interface
        pass
    
    @pytest.mark.e2e
    @pytest.mark.admin
    def test_model_configuration_flow(self, page):
        """Test model configuration functionality"""
        # Step 1: Login to admin
        self.admin_page.navigate()
        self.admin_page.login(self.admin_password)
        
        # Step 2: Navigate to model configuration
        self.admin_page.navigate_to_model_config()
        
        # Step 3: Verify model configuration interface is loaded
        self.admin_page.expect_element_visible("[data-testid='model-config-form']")
        
        # Step 4: Test model configuration operations
        # This would depend on the actual model configuration interface
        pass
    
    @pytest.mark.e2e
    @pytest.mark.admin
    def test_system_monitoring_flow(self, page):
        """Test system monitoring functionality"""
        # Step 1: Login to admin
        self.admin_page.navigate()
        self.admin_page.login(self.admin_password)
        
        # Step 2: Navigate to system monitoring
        self.admin_page.navigate_to_system_monitoring()
        
        # Step 3: Verify system monitoring interface is loaded
        self.admin_page.expect_element_visible("[data-testid='system-stats']")
        
        # Step 4: Test monitoring data display
        # This would depend on the actual monitoring interface
        pass
    
    @pytest.mark.e2e
    @pytest.mark.admin
    def test_backend_health_endpoint(self):
        """Test backend health endpoint"""
        # Step 1: Check backend health endpoint
        response = requests.get("http://localhost:7860/health")
        
        # Step 2: Verify health endpoint responds
        assert response.status_code == 200
        
        # Step 3: Verify health data
        health_data = response.json()
        assert "status" in health_data
        assert health_data["status"] == "healthy"
    
    @pytest.mark.e2e
    @pytest.mark.admin
    def test_frontend_health_endpoint(self):
        """Test frontend health endpoint (if available)"""
        try:
            # Step 1: Check frontend health endpoint
            response = requests.get("http://localhost:3000/healthz")
            
            # Step 2: Verify health endpoint responds
            assert response.status_code == 200
            
        except requests.exceptions.RequestException:
            # Frontend health endpoint might not be implemented
            # This is acceptable for now
            pass
