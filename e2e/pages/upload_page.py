from .base_page import BasePage
from playwright.sync_api import expect

class UploadPage(BasePage):
    """Page object for the upload page"""
    
    # Selectors using data-testid for stability
    DROP_ZONE = "[data-testid='drop-zone']"
    FILE_INPUT = "[data-testid='file-input']"
    UPLOAD_BUTTON = "[data-testid='upload-button']"
    GENERATE_BUTTON = "[data-testid='generate-button']"
    FILE_PREVIEW = "[data-testid='file-preview']"
    LOADING_SPINNER = "[data-testid='loading-spinner']"
    SUCCESS_MESSAGE = "[data-testid='success-message']"
    ERROR_MESSAGE = "[data-testid='error-message']"
    
    def __init__(self, page):
        super().__init__(page)
        self.page_url = "/upload"
    
    def navigate(self):
        """Navigate to upload page"""
        self.navigate_to(self.page_url)
        self.expect_element_visible(self.DROP_ZONE)
    
    def upload_file(self, file_path: str):
        """Upload a file using drag and drop or file input"""
        # Try drag and drop first, fallback to file input
        try:
            self.page.drag_and_drop(f"input[type='file']", self.DROP_ZONE)
            self.page.set_input_files(self.FILE_INPUT, file_path)
        except:
            # Fallback to direct file input
            self.page.set_input_files(self.FILE_INPUT, file_path)
        
        # Wait for file preview
        self.expect_element_visible(self.FILE_PREVIEW)
    
    def click_generate(self):
        """Click the generate button to start analysis"""
        self.click_element(self.GENERATE_BUTTON)
        self.expect_element_visible(self.LOADING_SPINNER)
    
    def wait_for_generation_complete(self):
        """Wait for generation to complete"""
        self.expect_element_not_visible(self.LOADING_SPINNER)
        self.expect_element_visible(self.SUCCESS_MESSAGE)
    
    def expect_success_message(self):
        """Expect success message to be visible"""
        self.expect_element_visible(self.SUCCESS_MESSAGE)
    
    def expect_error_message(self):
        """Expect error message to be visible"""
        self.expect_element_visible(self.ERROR_MESSAGE)
    
    def get_uploaded_file_name(self) -> str:
        """Get the name of the uploaded file"""
        return self.get_text(self.FILE_PREVIEW)
