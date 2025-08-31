from .base_page import BasePage
from playwright.sync_api import expect

class ExplorePage(BasePage):
    """Page object for the explore page"""
    
    # Selectors using data-testid for stability
    SEARCH_INPUT = "[data-testid='search-input']"
    FILTER_SOURCE = "[data-testid='filter-source']"
    FILTER_CATEGORY = "[data-testid='filter-category']"
    FILTER_REGION = "[data-testid='filter-region']"
    FILTER_COUNTRY = "[data-testid='filter-country']"
    FILTER_IMAGE_TYPE = "[data-testid='filter-image-type']"
    CLEAR_FILTERS_BUTTON = "[data-testid='clear-filters-button']"
    IMAGE_GRID = "[data-testid='image-grid']"
    IMAGE_CARD = "[data-testid='image-card']"
    EXPORT_BUTTON = "[data-testid='export-button']"
    LOADING_SPINNER = "[data-testid='loading-spinner']"
    
    def __init__(self, page):
        super().__init__(page)
        self.page_url = "/explore"
    
    def navigate(self):
        """Navigate to explore page"""
        self.navigate_to(self.page_url)
        self.expect_element_visible(self.IMAGE_GRID)
    
    def search_images(self, search_term: str):
        """Search for images"""
        self.fill_input(self.SEARCH_INPUT, search_term)
        self.page.keyboard.press("Enter")
        self.page.wait_for_load_state("networkidle")
    
    def filter_by_source(self, source: str):
        """Filter by source"""
        self.click_element(self.FILTER_SOURCE)
        self.page.click(f"text={source}")
        self.page.wait_for_load_state("networkidle")
    
    def filter_by_category(self, category: str):
        """Filter by category"""
        self.click_element(self.FILTER_CATEGORY)
        self.page.click(f"text={category}")
        self.page.wait_for_load_state("networkidle")
    
    def filter_by_region(self, region: str):
        """Filter by region"""
        self.click_element(self.FILTER_REGION)
        self.page.click(f"text={region}")
        self.page.wait_for_load_state("networkidle")
    
    def clear_filters(self):
        """Clear all filters"""
        self.click_element(self.CLEAR_FILTERS_BUTTON)
        self.page.wait_for_load_state("networkidle")
    
    def get_image_count(self) -> int:
        """Get the number of images displayed"""
        return len(self.page.locator(self.IMAGE_CARD).all())
    
    def click_image(self, index: int = 0):
        """Click on an image to view details"""
        images = self.page.locator(self.IMAGE_CARD).all()
        if len(images) > index:
            images[index].click()
            self.page.wait_for_load_state("networkidle")
    
    def click_export(self):
        """Click the export button"""
        self.click_element(self.EXPORT_BUTTON)
    
    def expect_images_loaded(self):
        """Expect images to be loaded"""
        self.expect_element_not_visible(self.LOADING_SPINNER)
        self.expect_element_visible(self.IMAGE_GRID)
    
    def expect_no_images_found(self):
        """Expect no images message"""
        self.page.locator("text=No images found").toBeVisible()
