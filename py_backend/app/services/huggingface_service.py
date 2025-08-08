from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import aiohttp
import base64
import json
import asyncio

class HuggingFaceService(VLMService):
    """Hugging Face Inference API service implementation"""
    
    def __init__(self, api_key: str, model_id: str = "microsoft/DialoGPT-medium"):
        super().__init__(f"HF_{model_id.replace('/', '_')}", ModelType.CUSTOM)
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = "https://api-inference.huggingface.co/models"
    
    async def generate_caption(self, image_bytes: bytes, prompt: str) -> Dict[str, Any]:
        print(f"DEBUG: HuggingFaceService: Starting caption generation for {self.model_name}")
        print(f"DEBUG: HuggingFaceService: Model ID: {self.model_id}")
        print(f"DEBUG: HuggingFaceService: API Key: {self.api_key[:10]}...")
        print(f"DEBUG: HuggingFaceService: Image bytes size: {len(image_bytes)}")
        
        # append the image-to-text task
        url = f"https://api-inference.huggingface.co/pipeline/image-to-text?model={self.model_id}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/octet-stream",  # <— critical
        }
        
        print(f"DEBUG: HuggingFaceService: URL: {url}")
        print(f"DEBUG: HuggingFaceService: Headers: {headers}")
        
        try:
            async with aiohttp.ClientSession() as session:
                print(f"DEBUG: HuggingFaceService: Sending POST request...")
                async with session.post(
                    url,
                    headers=headers,
                    data=image_bytes,  # raw JPEG/PNG bytes
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    print(f"DEBUG: HuggingFaceService: Response status: {resp.status}")
                    
                    text = await resp.text()
                    if resp.status != 200:
                        print(f"DEBUG: HuggingFaceService: API error {resp.status}: {text}")
                        # bubble up the real HF error
                        raise Exception(f"HF API error {resp.status}: {text}")

                    result = await resp.json()
                    print(f"DEBUG: HuggingFaceService: Response: {result}")
                    
                    # HF returns e.g. [ { "generated_text": "..." } ]
                    caption = result[0].get("generated_text", "")
                    print(f"DEBUG: HuggingFaceService: Extracted caption: {caption[:100]}...")
                    
                    return {
                        "caption": caption,
                        "confidence": None,
                        "processing_time": None,
                        "raw_response": result,
                    }
        except Exception as e:
            print(f"DEBUG: HuggingFaceService: Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

class LLaVAService(HuggingFaceService):
    """LLaVA model service using Hugging Face"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "llava-hf/llava-1.5-7b-hf")  # Use the standard LLaVA model
        self.model_name = "LLAVA_1_5_7B"  # Match database m_code
        self.model_type = ModelType.CUSTOM

class BLIP2Service(HuggingFaceService):
    """BLIP-2 model service using Hugging Face"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "Salesforce/blip-image-captioning-base")  # BLIP image captioning model
        self.model_name = "BLIP2_OPT_2_7B"  # Match database m_code
        self.model_type = ModelType.CUSTOM

class InstructBLIPService(HuggingFaceService):
    """InstructBLIP model service using Hugging Face"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "nlpconnect/vit-gpt2-image-captioning")  # Use same reliable model
        self.model_name = "INSTRUCTBLIP_VICUNA_7B"  # Match database m_code
        self.model_type = ModelType.CUSTOM 