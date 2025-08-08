from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import asyncio

class StubVLMService(VLMService):
    """Stub VLM service for testing and development"""
    
    def __init__(self):
        super().__init__("STUB_MODEL", ModelType.CUSTOM)
    
    async def generate_caption(self, image_bytes: bytes, prompt: str) -> Dict[str, Any]:
        """Generate a stub caption"""
        print(f"DEBUG: StubVLMService: Generating stub caption")
        print(f"DEBUG: StubVLMService: Image size: {len(image_bytes)}")
        print(f"DEBUG: StubVLMService: Prompt: {prompt[:100]}...")
        
        # Simulate processing time
        await asyncio.sleep(0.1)
        
        caption = "This is a stub caption generated for testing purposes. The image appears to contain geographic or crisis-related information."
        print(f"DEBUG: StubVLMService: Generated caption: {caption}")
        
        return {
            "caption": caption,
            "confidence": 0.85,
            "processing_time": 0.1,
            "raw_response": {
                "stub": True,
                "prompt": prompt,
                "image_size": len(image_bytes)
            }
        } 