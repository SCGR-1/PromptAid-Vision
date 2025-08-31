import pytest
import os
from playwright.sync_api import Page, expect
from pages.upload_page import UploadPage
from pages.explore_page import ExplorePage

class TestUploadFlow:
    """E2E tests for the upload flow - user-facing happy path"""
    
    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        """Setup for each test"""
        self.upload_page = UploadPage(page)
        self.explore_page = ExplorePage(page)
        self.test_image_path = os.path.join(os.path.dirname(__file__), "../fixtures/test_image.jpg")
    
    @pytest.mark.e2e
    @pytest.mark.upload
    def test_complete_upload_flow(self, page: Page):
        """Test complete upload workflow from file selection to analysis completion"""
        # Step 1: Navigate to upload page
        self.upload_page.navigate()
        
        # Step 2: Upload a file
        self.upload_page.upload_file(self.test_image_path)
        
        # Step 3: Verify file preview is shown
        file_name = self.upload_page.get_uploaded_file_name()
        assert "test_image" in file_name.lower()
        
        # Step 4: Click generate button
        self.upload_page.click_generate()
        
        # Step 5: Wait for generation to complete
        self.upload_page.wait_for_generation_complete()
        
        # Step 6: Verify success message
        self.upload_page.expect_success_message()
        
        # Step 7: Navigate to explore page to verify image appears
        self.explore_page.navigate()
        self.explore_page.expect_images_loaded()
        
        # Step 8: Verify uploaded image is in the list
        image_count = self.explore_page.get_image_count()
        assert image_count > 0
    
    @pytest.mark.e2e
    @pytest.mark.upload
    def test_upload_invalid_file(self, page: Page):
        """Test upload with invalid file type"""
        # Step 1: Navigate to upload page
        self.upload_page.navigate()
        
        # Step 2: Try to upload an invalid file (text file)
        invalid_file_path = os.path.join(os.path.dirname(__file__), "../fixtures/invalid.txt")
        with open(invalid_file_path, "w") as f:
            f.write("This is not an image file")
        
        self.upload_page.upload_file(invalid_file_path)
        
        # Step 3: Verify error message is shown
        self.upload_page.expect_error_message()
        
        # Cleanup
        os.remove(invalid_file_path)
    
    @pytest.mark.e2e
    @pytest.mark.upload
    def test_upload_large_file(self, page: Page):
        """Test upload with large file handling"""
        # Step 1: Navigate to upload page
        self.upload_page.navigate()
        
        # Step 2: Create a large file (simulate large image)
        large_file_path = os.path.join(os.path.dirname(__file__), "../fixtures/large_image.jpg")
        with open(large_file_path, "wb") as f:
            f.write(b"0" * 10 * 1024 * 1024)  # 10MB file
        
        # Step 3: Upload the large file
        self.upload_page.upload_file(large_file_path)
        
        # Step 4: Verify file is accepted or appropriate error shown
        try:
            self.upload_page.expect_element_visible(self.upload_page.FILE_PREVIEW)
        except:
            self.upload_page.expect_error_message()
        
        # Cleanup
        os.remove(large_file_path)
