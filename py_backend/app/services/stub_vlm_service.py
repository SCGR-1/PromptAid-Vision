from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import asyncio

class StubVLMService(VLMService):
    """Stub VLM service for testing and development"""
    
    def __init__(self):
        super().__init__("STUB_MODEL", ModelType.CUSTOM)
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> dict:
        """Generate a stub caption for testing purposes."""
        caption = f"This is a stub caption for testing. Image size: {len(image_bytes)} bytes. Prompt: {prompt[:50]}..."
        
        return {
            "caption": caption,
            "raw_response": {"stub": True, "caption": caption},
            "metadata": {}
        } 