from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import asyncio
import time
import re
import json

import google.generativeai as genai


def sanitize_sensitive_data(text: str) -> str:
    """Remove sensitive information from text"""
    if not text:
        return text
    
    # API key patterns
    text = text.replace("sk-", "***")
    text = text.replace("AIza", "***")
    text = text.replace("hf_", "***")
    
    # Remove any remaining API keys (look for long strings that might be keys)
    # Remove strings that look like API keys (32+ characters, alphanumeric)
    text = re.sub(r'\b[a-zA-Z0-9]{32,}\b', '***', text)
    
    # Remove any URLs that might contain tokens
    text = re.sub(r'https?://[^\s]+', '***', text)
    
    # Remove any file paths that might contain sensitive info
    text = re.sub(r'/[^\s]+', '***', text)
    
    return text

class GeminiService(VLMService):
    """Google Gemini Vision service implementation"""

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        super().__init__("Gemini", ModelType.GEMINI_PRO_VISION)
        self.model_name = "GEMINI15"
        genai.configure(api_key=api_key)
        self.model_id = model
        self.model = genai.GenerativeModel(self.model_id)

    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        """Generate caption using Google Gemini Vision"""
        print(f"🔍 Gemini: Starting caption generation for {len(image_bytes)} bytes")
        print(f"🔍 Gemini: Prompt: {prompt[:100]}...")
        print(f"🔍 Gemini: Metadata instructions: {metadata_instructions[:100]}...")
        
        instruction = prompt + "\n\n" + metadata_instructions

        image_part = {
            "mime_type": "image/jpeg",
            "data": image_bytes,
        }

        start = time.time()
        try:
            print(f"🔍 Gemini: Calling Google Gemini API with model: {self.model_id}")
            response = await asyncio.to_thread(self.model.generate_content, [instruction, image_part])
            elapsed = time.time() - start
            
            print(f"🔍 Gemini: API call successful, response received")
            content = response.text
            print(f"🔍 Gemini: Raw content length: {len(content)}")
            
            # Parse the response
            try:
                result = json.loads(content)
                print(f"🔍 Gemini: JSON response parsed successfully")
            except json.JSONDecodeError as e:
                print(f"⚠️ Gemini: JSON parse error: {e}")
                raise Exception(f"MODEL_UNAVAILABLE: GEMINI15 is currently unavailable (invalid response format). Switching to another model.")
            
            # Extract the generated text
            if "candidates" in result and len(result["candidates"]) > 0:
                candidate = result["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if len(parts) > 0 and "text" in parts[0]:
                        generated_text = parts[0]["text"]
                    else:
                        generated_text = "No text generated"
                else:
                    generated_text = "No content in response"
            else:
                generated_text = "No candidates in response"
            
            print(f"🔍 Gemini: Caption generation completed successfully")
            
            return {
                "caption": generated_text,
                "raw_response": {
                    "model": self.model_id,
                    "response": result,
                    "generated_text": generated_text
                },
                "metadata": {}
            }
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"❌ Gemini: Error occurred during caption generation")
            print(f"❌ Gemini: Error type: {error_type}")
            print(f"❌ Gemini: Error message: {error_msg}")
            
            sanitized_error = sanitize_sensitive_data(error_msg)
            
            if "quota" in error_msg.lower() or "limit" in error_msg.lower():
                print(f"❌ Gemini: Quota or rate limit exceeded detected")
                raise Exception(f"MODEL_UNAVAILABLE: GEMINI15 is currently unavailable (quota/rate limit exceeded). Switching to another model.")
            elif "authentication" in error_msg.lower() or "invalid" in error_msg.lower() or "api_key" in error_msg.lower():
                print(f"❌ Gemini: Authentication or API key error detected")
                raise Exception(f"MODEL_UNAVAILABLE: GEMINI15 is currently unavailable (authentication error). Switching to another model.")
            elif "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                print(f"❌ Gemini: Network timeout or connection error detected")
                raise Exception(f"MODEL_UNAVAILABLE: GEMINI15 is currently unavailable (network error). Switching to another model.")
            else:
                print(f"❌ Gemini: Generic error, converting to MODEL_UNAVAILABLE")
                raise Exception(f"MODEL_UNAVAILABLE: GEMINI15 is currently unavailable ({error_type}: {sanitized_error}). Switching to another model.")


