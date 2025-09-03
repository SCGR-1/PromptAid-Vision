# services/huggingface_service.py
from .vlm_service import VLMService, ModelType
from typing import Dict, Any, List
import aiohttp
import base64
import time
import re
import json
import imghdr


class HuggingFaceService(VLMService):
    """
    HuggingFace Inference Providers service implementation.
    Supports OpenAI-compatible APIs.
    """
    
    def __init__(self, api_key: str, model_id: str, providers_url: str):
        super().__init__("HuggingFace", ModelType.HUGGINGFACE)
        self.api_key = api_key
        self.model_id = model_id
        self.providers_url = providers_url
        self.model_name = model_id

    def _guess_mime(self, image_bytes: bytes) -> str:
        kind = imghdr.what(None, h=image_bytes)
        if kind == "jpeg":
            return "image/jpeg"
        if kind == "png":
            return "image/png"
        if kind == "gif":
            return "image/gif"
        if kind == "webp":
            return "image/webp"
        return "image/jpeg"

    async def generate_caption(
        self,
        image_bytes: bytes,
        prompt: str,
        metadata_instructions: str = "",
    ) -> Dict[str, Any]:
        """
        Generate caption using HF Inference Providers (OpenAI-style).
        """
        start_time = time.time()

        instruction = (prompt or "").strip()
        if metadata_instructions:
            instruction += "\n\n" + metadata_instructions.strip()

        mime = self._guess_mime(image_bytes)
        data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('utf-8')}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # OpenAI-compatible chat payload with one text + one image block.
        payload = {
            "model": self.model_id,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": instruction},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            "max_tokens": 512,
            "temperature": 0.2,
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.providers_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=180),
                ) as resp:
                    raw_text = await resp.text()
                    if resp.status != 200:
                        # Any non-200 status - throw generic error for fallback handling
                        raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} is currently unavailable (HTTP {resp.status}). Switching to another model.")
                    result = await resp.json()
        except Exception as e:
            if "MODEL_UNAVAILABLE" in str(e):
                raise  # Re-raise model unavailable exceptions as-is
            # Catch any other errors (network, timeout, parsing, etc.) and treat as model unavailable
            raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} is currently unavailable due to an error. Switching to another model.")

        # Extract model output (string or list-of-blocks)
        message = (result.get("choices") or [{}])[0].get("message", {})
        content = message.get("content", "")
        
        # GLM models sometimes put content in reasoning_content field
        if not content and message.get("reasoning_content"):
            content = message.get("reasoning_content", "")

        if isinstance(content, list):
            # Some providers may return a list of output blocks (e.g., {"type":"output_text","text":...})
            parts = []
            for block in content:
                if isinstance(block, dict):
                    parts.append(block.get("text") or block.get("content") or "")
                else:
                    parts.append(str(block))
            content = "\n".join([p for p in parts if p])

        caption = content or ""
        cleaned = caption.strip()

        # Strip accidental fenced JSON
        if cleaned.startswith("```json"):
            cleaned = re.sub(r"^```json\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        # Best-effort JSON protocol
        metadata = {}
        description = ""
        analysis = cleaned
        recommended_actions = ""
        
        try:
            parsed = json.loads(cleaned)
            description = parsed.get("description", "")
            analysis = parsed.get("analysis", cleaned)
            recommended_actions = parsed.get("recommended_actions", "")
            metadata = parsed.get("metadata", {})
            
            # Combine all three parts for backward compatibility
            caption_text = f"Description: {description}\n\nAnalysis: {analysis}\n\nRecommended Actions: {recommended_actions}"
        except json.JSONDecodeError:
            caption_text = cleaned

        elapsed = time.time() - start_time

        return {
            "caption": caption_text,
            "metadata": metadata,
            "confidence": None,
            "processing_time": elapsed,
            "raw_response": {
                "model": self.model_id,
                "content": content,
                "parsed": parsed if 'parsed' in locals() else None
            },
            "description": description,
            "analysis": analysis,
            "recommended_actions": recommended_actions
        }

    async def generate_multi_image_caption(
        self,
        image_bytes_list: List[bytes],
        prompt: str,
        metadata_instructions: str = "",
    ) -> Dict[str, Any]:
        """
        Generate caption for multiple images using HF Inference Providers (OpenAI-style).
        """
        start_time = time.time()

        instruction = (prompt or "").strip()
        if metadata_instructions:
            instruction += "\n\n" + metadata_instructions.strip()

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Create content array with text and multiple images
        content = [{"type": "text", "text": instruction}]
        
        # Add each image to the content
        for image_bytes in image_bytes_list:
            mime = self._guess_mime(image_bytes)
            data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
            content.append({"type": "image_url", "image_url": {"url": data_url}})

        # OpenAI-compatible chat payload with one text + multiple image blocks.
        payload = {
            "model": self.model_id,
            "messages": [
                {
                    "role": "user",
                    "content": content,
                }
            ],
            "max_tokens": 800,  # Increased for multiple images
            "temperature": 0.2,
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.providers_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=180),
                ) as resp:
                    raw_text = await resp.text()
                    if resp.status != 200:
                        # Any non-200 status - throw generic error for fallback handling
                        raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} is currently unavailable (HTTP {resp.status}). Switching to another model.")
                    result = await resp.json()
        except Exception as e:
            if "MODEL_UNAVAILABLE" in str(e):
                raise  # Re-raise model unavailable exceptions as-is
            # Catch any other errors (network, timeout, parsing, etc.) and treat as model unavailable
            raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} is currently unavailable due to an error. Switching to another model.")

        # Extract model output (string or list-of-blocks)
        message = (result.get("choices") or [{}])[0].get("message", {})
        content = message.get("content", "")
        
        # GLM models sometimes put content in reasoning_content field
        if not content and message.get("reasoning_content"):
            content = message.get("reasoning_content", "")

        if isinstance(content, list):
            # Some providers may return a list of output blocks (e.g., {"type":"output_text","text":...})
            parts = []
            for block in content:
                if isinstance(block, dict):
                    parts.append(block.get("text") or block.get("content") or "")
                else:
                    parts.append(str(block))
            content = "\n".join([p for p in parts if p])

        caption = content or ""
        cleaned = caption.strip()

        # Strip accidental fenced JSON
        if cleaned.startswith("```json"):
            cleaned = re.sub(r"^```json\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        # Best-effort JSON protocol
        metadata = {}
        description = ""
        analysis = cleaned
        recommended_actions = ""
        
        try:
            parsed = json.loads(cleaned)
            description = parsed.get("description", "")
            analysis = parsed.get("analysis", cleaned)
            recommended_actions = parsed.get("recommended_actions", "")
            metadata = parsed.get("metadata", {})
            
            # Combine all three parts for backward compatibility
            caption_text = f"Description: {description}\n\nAnalysis: {analysis}\n\nRecommended Actions: {recommended_actions}"
        except json.JSONDecodeError:
            caption_text = cleaned

        elapsed = time.time() - start_time

        return {
            "caption": caption_text,
            "metadata": metadata,
            "confidence": None,
            "processing_time": elapsed,
            "raw_response": {
                "model": self.model_id,
                "content": content,
                "parsed": parsed if 'parsed' in locals() else None,
                "image_count": len(image_bytes_list)
            },
            "description": description,
            "analysis": analysis,
            "recommended_actions": recommended_actions
        }


# --- Generic Model Wrapper for Dynamic Registration ---

class ProvidersGenericVLMService(HuggingFaceService):
    """
    Generic wrapper so you can register ANY Providers VLM by model_id from config.
    Example:
      ProvidersGenericVLMService(HF_TOKEN, "Qwen/Qwen2.5-VL-32B-Instruct", "QWEN2_5_VL_32B")
    """
    def __init__(self, api_key: str, model_id: str, public_name: str | None = None):
        super().__init__(api_key, model_id)
        # Use a human-friendly stable name that your UI/DB will reference
        self.model_name = public_name or model_id.replace("/", "_").upper()
        self.model_type = ModelType.CUSTOM
class ProvidersGenericVLMService(HuggingFaceService):
    """
    Generic wrapper so you can register ANY Providers VLM by model_id from config.
    Example:
      ProvidersGenericVLMService(HF_TOKEN, "Qwen/Qwen2.5-VL-32B-Instruct", "QWEN2_5_VL_32B")
    """
    def __init__(self, api_key: str, model_id: str, public_name: str | None = None):
        super().__init__(api_key, model_id)
        # Use a human-friendly stable name that your UI/DB will reference
        self.model_name = public_name or model_id.replace("/", "_").upper()
        self.model_type = ModelType.CUSTOM

