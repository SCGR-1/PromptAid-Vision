from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import asyncio
import time
import re
import json

import google.generativeai as genai


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
            content = getattr(response, "text", None) or ""
            print(f"🔍 Gemini: Raw content length: {len(content)}")
            print(f"🔍 Gemini: Content preview: {content[:200]}...")

            cleaned_content = content
            if cleaned_content.startswith("```json"):
                cleaned_content = re.sub(r"^```json\s*", "", cleaned_content)
                cleaned_content = re.sub(r"\s*```$", "", cleaned_content)

            try:
                parsed = json.loads(cleaned_content)
                caption_text = parsed.get("analysis", content)
                metadata = parsed.get("metadata", {})
                print(f"🔍 Gemini: JSON parsed successfully, metadata keys: {list(metadata.keys())}")
                
                if metadata.get("epsg"):
                    epsg_value = metadata["epsg"]
                    allowed_epsg = ["4326", "3857", "32617", "32633", "32634", "OTHER"]
                    if epsg_value not in allowed_epsg:
                        metadata["epsg"] = "OTHER"
                        print(f"🔍 Gemini: EPSG value {epsg_value} not in allowed list, set to OTHER")
            except json.JSONDecodeError as e:
                print(f"⚠️ Gemini: JSON parse error: {e}")
                caption_text = content
                metadata = {}

            raw_response: Dict[str, Any] = {"model": self.model_id}
            
            print(f"🔍 Gemini: Final metadata: {metadata}")
            print(f"🔍 Gemini: Caption generation completed successfully in {elapsed:.2f}s")

            return {
                "caption": caption_text,
                "metadata": metadata,
                "confidence": None,
                "processing_time": elapsed,
                "raw_response": raw_response,
            }
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"❌ Gemini: Error occurred during caption generation")
            print(f"❌ Gemini: Error type: {error_type}")
            print(f"❌ Gemini: Error message: {error_msg}")
            
            # Check for specific error types
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
                raise Exception(f"MODEL_UNAVAILABLE: GEMINI15 is currently unavailable ({error_type}: {error_msg}). Switching to another model.")


