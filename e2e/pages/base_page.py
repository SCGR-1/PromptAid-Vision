from playwright.sync_api import Page, expect
import time

class BasePage:
    """Base page object with common functionality"""
    
    def __init__(self, page: Page):
        self.page = page
        self.base_url = "http://localhost:3000"
    
    def navigate_to(self, path: str = ""):
        """Navigate to the page"""
        self.page.goto(f"{self.base_url}{path}")
        self.page.wait_for_load_state("networkidle")
    
    def wait_for_element(self, selector: str, timeout: int = 10000):
        """Wait for element to be visible"""
        self.page.wait_for_selector(selector, timeout=timeout)
    
    def click_element(self, selector: str):
        """Click element with auto-wait"""
        self.page.click(selector)
    
    def fill_input(self, selector: str, value: str):
        """Fill input field with auto-wait"""
        self.page.fill(selector, value)
    
    def expect_element_visible(self, selector: str):
        """Expect element to be visible"""
        expect(self.page.locator(selector)).toBeVisible()
    
    def expect_element_not_visible(self, selector: str):
        """Expect element to not be visible"""
        expect(self.page.locator(selector)).not_to_be_visible()
    
    def expect_url_contains(self, url_part: str):
        """Expect URL to contain specific part"""
        expect(self.page).to_have_url(f".*{url_part}.*")
    
    def get_text(self, selector: str) -> str:
        """Get text content of element"""
        return self.page.locator(selector).text_content()
    
    def upload_file(self, file_input_selector: str, file_path: str):
        """Upload file using file input"""
        self.page.set_input_files(file_input_selector, file_path)
