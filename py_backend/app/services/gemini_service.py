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
        instruction = prompt + "\n\n" + metadata_instructions

        image_part = {
            "mime_type": "image/jpeg",
            "data": image_bytes,
        }

        start = time.time()
        response = await asyncio.to_thread(self.model.generate_content, [instruction, image_part])
        elapsed = time.time() - start

        content = getattr(response, "text", None) or ""

        cleaned_content = content
        if cleaned_content.startswith("```json"):
            cleaned_content = re.sub(r"^```json\s*", "", cleaned_content)
            cleaned_content = re.sub(r"\s*```$", "", cleaned_content)

        try:
            parsed = json.loads(cleaned_content)
            caption_text = parsed.get("analysis", content)
            metadata = parsed.get("metadata", {})
            if metadata.get("epsg"):
                epsg_value = metadata["epsg"]
                allowed_epsg = ["4326", "3857", "32617", "32633", "32634", "OTHER"]
                if epsg_value not in allowed_epsg:
                    metadata["epsg"] = "OTHER"
        except json.JSONDecodeError:
            caption_text = content
            metadata = {}

        raw_response: Dict[str, Any] = {"model": self.model_id}

        return {
            "caption": caption_text,
            "metadata": metadata,
            "confidence": None,
            "processing_time": elapsed,
            "raw_response": raw_response,
        }


