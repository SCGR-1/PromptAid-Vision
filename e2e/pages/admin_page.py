from .base_page import BasePage
from playwright.sync_api import expect

class AdminPage(BasePage):
    """Page object for the admin page"""
    
    # Selectors using data-testid for stability
    LOGIN_FORM = "[data-testid='login-form']"
    PASSWORD_INPUT = "[data-testid='password-input']"
    LOGIN_BUTTON = "[data-testid='login-button']"
    ADMIN_DASHBOARD = "[data-testid='admin-dashboard']"
    SCHEMA_MANAGEMENT = "[data-testid='schema-management']"
    MODEL_CONFIG = "[data-testid='model-config']"
    SYSTEM_MONITORING = "[data-testid='system-monitoring']"
    LOGOUT_BUTTON = "[data-testid='logout-button']"
    SAVE_BUTTON = "[data-testid='save-button']"
    SUCCESS_MESSAGE = "[data-testid='success-message']"
    ERROR_MESSAGE = "[data-testid='error-message']"
    
    def __init__(self, page):
        super().__init__(page)
        self.page_url = "/admin"
    
    def navigate(self):
        """Navigate to admin page"""
        self.navigate_to(self.page_url)
        self.expect_element_visible(self.LOGIN_FORM)
    
    def login(self, password: str):
        """Login to admin panel"""
        self.fill_input(self.PASSWORD_INPUT, password)
        self.click_element(self.LOGIN_BUTTON)
        self.expect_element_visible(self.ADMIN_DASHBOARD)
    
    def logout(self):
        """Logout from admin panel"""
        self.click_element(self.LOGOUT_BUTTON)
        self.expect_element_visible(self.LOGIN_FORM)
    
    def navigate_to_schema_management(self):
        """Navigate to schema management section"""
        self.click_element(self.SCHEMA_MANAGEMENT)
        self.page.wait_for_load_state("networkidle")
    
    def navigate_to_model_config(self):
        """Navigate to model configuration section"""
        self.click_element(self.MODEL_CONFIG)
        self.page.wait_for_load_state("networkidle")
    
    def navigate_to_system_monitoring(self):
        """Navigate to system monitoring section"""
        self.click_element(self.SYSTEM_MONITORING)
        self.page.wait_for_load_state("networkidle")
    
    def save_configuration(self):
        """Save configuration changes"""
        self.click_element(self.SAVE_BUTTON)
        self.expect_element_visible(self.SUCCESS_MESSAGE)
    
    def expect_admin_access(self):
        """Expect admin dashboard to be visible"""
        self.expect_element_visible(self.ADMIN_DASHBOARD)
    
    def expect_login_required(self):
        """Expect login form to be visible"""
        self.expect_element_visible(self.LOGIN_FORM)
    
    def expect_success_message(self):
        """Expect success message to be visible"""
        self.expect_element_visible(self.SUCCESS_MESSAGE)
    
    def expect_error_message(self):
        """Expect error message to be visible"""
        self.expect_element_visible(self.ERROR_MESSAGE)
