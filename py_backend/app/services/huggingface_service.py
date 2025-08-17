from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import aiohttp
import base64
import json
import time
import re

class HuggingFaceService(VLMService):
    """Hugging Face Inference API service implementation"""
    
    def __init__(self, api_key: str, model_id: str = "microsoft/DialoGPT-medium"):
        super().__init__(f"HF_{model_id.replace('/', '_')}", ModelType.CUSTOM)
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = "https://api-inference.huggingface.co/models"
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        """Generate caption using Hugging Face Inference API"""
        start_time = time.time()
        
        instruction = prompt + "\n\n" + metadata_instructions
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        url = f"{self.base_url}/{self.model_id}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if "llava" in self.model_id.lower():
            payload = {
                "inputs": [
                    {"type": "text", "text": instruction},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ],
                "parameters": {
                    "max_new_tokens": 800,
                    "temperature": 0.7,
                    "do_sample": True
                }
            }
        elif "blip" in self.model_id.lower():
            payload = {
                "inputs": f"data:image/jpeg;base64,{image_base64}",
                "parameters": {
                    "max_new_tokens": 800,
                    "temperature": 0.7
                }
            }
        else:
            payload = {
                "inputs": instruction,
                "parameters": {
                    "max_new_tokens": 800,
                    "temperature": 0.7,
                    "do_sample": True
                }
            }
        
        try:
            async with aiohttp.ClientSession() as session:
                
                if "blip" in self.model_id.lower():
                    url = f"https://api-inference.huggingface.co/pipeline/image-to-text"
                    payload = {
                        "inputs": f"data:image/jpeg;base64,{image_base64}",
                        "parameters": {
                            "max_new_tokens": 800,
                            "temperature": 0.7
                        }
                    }
                
                async with session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120),
                ) as resp:
                    text = await resp.text()
                    if resp.status != 200:
                        if resp.status == 503 and "loading" in text.lower():
                            raise Exception(f"Model {self.model_id} is still loading. Please wait a moment and try again.")
                        elif resp.status == 404:
                            raise Exception(f"Model {self.model_id} not found. Please check the model ID.")
                        else:
                            raise Exception(f"HF API error {resp.status}: {text}")

                    result = await resp.json()
                    
                    if isinstance(result, list) and len(result) > 0:
                        caption = result[0].get("generated_text", "")
                    elif isinstance(result, dict):
                        caption = result.get("generated_text", result.get("text", ""))
                    else:
                        caption = str(result)
                    
                    cleaned_content = caption
                    if caption.startswith('```json'):
                        cleaned_content = re.sub(r'^```json\s*', '', caption)
                        cleaned_content = re.sub(r'\s*```$', '', cleaned_content)
                    
                    try:
                        parsed = json.loads(cleaned_content)
                        caption_text = parsed.get("analysis", caption)
                        metadata = parsed.get("metadata", {})
                        
                        if metadata.get("epsg"):
                            epsg_value = metadata["epsg"]
                            allowed_epsg = ["4326", "3857", "32617", "32633", "32634", "OTHER"]
                            if epsg_value not in allowed_epsg:
                                metadata["epsg"] = "OTHER"
                        
                    except json.JSONDecodeError as e:
                        caption_text = caption
                        metadata = {}
                    
                    elapsed_time = time.time() - start_time
                    
                    return {
                        "caption": caption_text,
                        "metadata": metadata,
                        "confidence": None,
                        "processing_time": elapsed_time,
                        "raw_response": {
                            "model": self.model_id,
                            "response": result,
                            "parsed_successfully": "metadata" in metadata
                        }
                    }
        except Exception as e:
            raise Exception(f"HuggingFace API error: {str(e)}")

class LLaVAService(HuggingFaceService):
    """LLaVA model service using Hugging Face"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "llava-hf/llava-1.5-7b-hf")
        self.model_name = "LLAVA_1_5_7B"
        self.model_type = ModelType.CUSTOM

class BLIP2Service(HuggingFaceService):
    """BLIP-2 model service using Hugging Face"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "Salesforce/blip-image-captioning-base")
        self.model_name = "BLIP2_OPT_2_7B"
        self.model_type = ModelType.CUSTOM

class InstructBLIPService(HuggingFaceService):
    """InstructBLIP model service using Hugging Face"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key, "microsoft/git-base")
        self.model_name = "INSTRUCTBLIP_VICUNA_7B"
        self.model_type = ModelType.CUSTOM 