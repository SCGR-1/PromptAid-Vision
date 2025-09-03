from .vlm_service import VLMService, ModelType
from typing import Dict, Any, List
import asyncio

class StubVLMService(VLMService):
    """Stub VLM service for testing and development"""
    
    def __init__(self):
        super().__init__("STUB_MODEL", ModelType.CUSTOM)
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> dict:
        """Generate a stub caption for testing purposes."""
        caption = f"This is a stub caption for testing. Image size: {len(image_bytes)} bytes. Prompt: {prompt[:50]}..."
        
        # Return data in the format expected by schema validator
        return {
            "caption": caption,
            "raw_response": {
                "stub": True,
                "analysis": caption,
                "metadata": {
                    "title": "Stub Generated Title",
                    "source": "OTHER",
                    "type": "OTHER", 
                    "countries": [],
                    "epsg": "OTHER"
                }
            },
            "metadata": {
                "title": "Stub Generated Title",
                "source": "OTHER",
                "type": "OTHER",
                "countries": [],
                "epsg": "OTHER"
            }
        }
    
    async def generate_multi_image_caption(self, image_bytes_list: List[bytes], prompt: str, metadata_instructions: str = "") -> dict:
        """Generate a stub caption for multiple images for testing purposes."""
        caption = f"This is a stub multi-image caption for testing. Number of images: {len(image_bytes_list)}. Total size: {sum(len(img) for img in image_bytes_list)} bytes. Prompt: {prompt[:50]}..."
        
        # Create individual metadata for each image
        metadata_images = {}
        for i, img_bytes in enumerate(image_bytes_list):
            metadata_images[f"image{i+1}"] = {
                "source": "OTHER",
                "type": "OTHER",
                "countries": [],
                "epsg": "OTHER"
            }
        
        # Return data in the format expected by schema validator
        return {
            "caption": caption,
            "raw_response": {
                "stub": True,
                "analysis": caption,
                "metadata": {
                    "title": "Stub Multi-Image Generated Title",
                    "metadata_images": metadata_images
                }
            },
            "metadata": {
                "title": "Stub Multi-Image Generated Title",
                "metadata_images": metadata_images
            }
        } 