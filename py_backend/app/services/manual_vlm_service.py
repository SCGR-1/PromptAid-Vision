from .vlm_service import VLMService, ModelType
from typing import Dict, Any, List
import asyncio

class ManualVLMService(VLMService):
    """Manual VLM service - returns empty values for manual entry mode"""
    
    def __init__(self):
        super().__init__("manual", ModelType.CUSTOM)
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> dict:
        """Generate empty caption for manual entry mode - user will fill in all fields manually."""
        # Return empty data structure - no placeholders, user fills everything manually
        return {
            "caption": "",
            "raw_response": {
                "manual": True,
                "analysis": "",
                "metadata": {
                    "title": "",
                    "source": "",
                    "type": "", 
                    "countries": [],
                    "epsg": ""
                }
            },
            "metadata": {
                "title": "",
                "source": "",
                "type": "",
                "countries": [],
                "epsg": ""
            }
        }
    
    async def generate_multi_image_caption(self, image_bytes_list: List[bytes], prompt: str, metadata_instructions: str = "") -> dict:
        """Generate empty caption for multiple images in manual entry mode - user will fill in all fields manually."""
        # Create empty metadata for each image
        metadata_images = {}
        for i in range(len(image_bytes_list)):
            metadata_images[f"image{i+1}"] = {
                "source": "",
                "type": "",
                "countries": [],
                "epsg": ""
            }
        
        # Return empty data structure - no placeholders, user fills everything manually
        return {
            "caption": "",
            "raw_response": {
                "manual": True,
                "analysis": "",
                "metadata": {
                    "title": "",
                    "metadata_images": metadata_images
                }
            },
            "metadata": {
                "title": "",
                "metadata_images": metadata_images
            }
        }

