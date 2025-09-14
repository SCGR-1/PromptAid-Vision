# services/huggingface_service.py
from __future__ import annotations


from .vlm_service import VLMService, ModelType, ServiceStatus

from typing import Dict, Any, List, Optional
import aiohttp
import base64
import time
import re
import json
import imghdr
import os


def _env_token() -> Optional[str]:
    return (
        os.getenv("HF_API_KEY")
        or os.getenv("HF_TOKEN")
        or os.getenv("HUGGINGFACEHUB_API_TOKEN")
    )


def _providers_url_default() -> str:
    # OpenAI-compatible gateway on HF Inference Providers
    return os.getenv("HF_PROVIDERS_URL", "https://router.huggingface.co/v1/chat/completions")


class HuggingFaceService(VLMService):
    """
    HuggingFace Inference Providers service implementation (OpenAI-compatible).
    - No network in __init__
    - Short, safe probe()
    - Lazy use during generate_*
    """

    def __init__(self, api_key: str, model_id: str, providers_url: str, public_name: str | None = None):
        super().__init__(
            public_name or (model_id or "HUGGINGFACE"),
            ModelType.CUSTOM,
            provider="huggingface",
            lazy_init=True,
        )
        self.api_key = api_key
        self.model_id = model_id
        self.providers_url = providers_url
            # also keep model_name aligned
        self.model_name = public_name or (model_id or "HUGGINGFACE")
        if not self.api_key or not self.model_id:
            self.is_available = False
            self.status = ServiceStatus.DEGRADED

    # ---------- helpers ----------

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

    # ---------- lifecycle ----------

    async def probe(self) -> bool:
        """
        Lightweight reachability check.
        - Validates token with whoami
        - Checks model endpoint exists/reachable
        Never raises, returns bool.
        """
        if not self.api_key or not self.model_id:
            return False

        try:
            timeout = aiohttp.ClientTimeout(total=5)
            headers_auth = {"Authorization": f"Bearer {self.api_key}"}

            async with aiohttp.ClientSession(timeout=timeout) as session:
                # Token check
                r1 = await session.get("https://huggingface.co/api/whoami-v2", headers=headers_auth)
                if r1.status != 200:
                    return False

                # Model reachability (Inference API — GET is fine)
                r2 = await session.get(f"https://api-inference.huggingface.co/models/{self.model_id}", headers=headers_auth)
                # Consider 200, 503 (loading), 403/404 (exists but gated/private) as "reachable"
                if r2.status in (200, 503, 403, 404):
                    return True
                return False
        except Exception:
            return False

    async def ensure_ready(self) -> bool:
        # Nothing to warm here; we keep it trivial.
        self._initialized = True
        return True

    # ---------- caption APIs ----------

    async def generate_caption(
        self,
        image_bytes: bytes,
        prompt: str,
        metadata_instructions: str = "",
    ) -> Dict[str, Any]:
        """
        Generate caption using HF Inference Providers (OpenAI-style chat).
        """
        if not self.api_key or not self.model_id:
            raise Exception("MODEL_UNAVAILABLE: HuggingFace credentials or model_id missing.")

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
            "max_tokens": 4096,
            "temperature": 0.2,
        }

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                async with session.post(
                    self.providers_url,
                    headers=headers,
                    json=payload,
                ) as resp:
                    raw_text = await resp.text()
                    if resp.status != 200:
                        # Surface a consistent, catchable error for fallback
                        raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} unavailable (HTTP {resp.status}).")
                    result = await resp.json()
        except Exception as e:
            # Never leak aiohttp exceptions outward as-is; normalize to your fallback signal
            if "MODEL_UNAVAILABLE" not in str(e):
                raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} is unavailable due to a network/error.")
            raise

        # ----- Parse response -----
        message = (result.get("choices") or [{}])[0].get("message", {})
        content = message.get("content", "")

        # GLM models sometimes put content in reasoning_content
        if not content and message.get("reasoning_content"):
            content = message.get("reasoning_content", "")

        if isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, dict):
                    parts.append(block.get("text") or block.get("content") or "")
                else:
                    parts.append(str(block))
            content = "\n".join([p for p in parts if p])

        caption = (content or "").strip()

        # Strip accidental fenced JSON and special tokens
        if caption.startswith("```json"):
            caption = re.sub(r"^```json\s*", "", caption)
            caption = re.sub(r"\s*```$", "", caption)
        
        # Strip GLM special tokens
        if caption.startswith("<|begin_of_box|>"):
            caption = caption[16:]  # Remove <|begin_of_box|>
        if caption.endswith("<|end_of_box|>"):
            caption = caption[:-15]  # Remove <|end_of_box|>

        metadata = {}
        description = ""
        analysis = caption
        recommended_actions = ""

        try:
            parsed = json.loads(caption)
            description = parsed.get("description", "")
            analysis = parsed.get("analysis", caption)
            recommended_actions = parsed.get("recommended_actions", "")
            metadata = parsed.get("metadata", {})
            caption_text = f"Description: {description}\n\nAnalysis: {analysis}\n\nRecommended Actions: {recommended_actions}"
        except json.JSONDecodeError:
            # If JSON parsing fails, treat the response as plain text analysis
            parsed = None
            description = ""
            analysis = caption
            recommended_actions = ""
            metadata = {}
            caption_text = caption
        
        # Fallback: if all structured fields are empty, put everything in analysis
        if not description and not recommended_actions and not metadata:
            analysis = caption
            caption_text = f"Description: \n\nAnalysis: {caption}\n\nRecommended Actions: "

        elapsed = time.time() - start_time

        return {
            "caption": caption_text,
            "metadata": metadata,
            "confidence": None,
            "processing_time": elapsed,
            "raw_response": {
                "model": self.model_id,
                "content": content,
                "metadata": metadata,
                "extracted_metadata": metadata,
                "parsed": parsed,
            },
            "description": description,
            "analysis": analysis,
            "recommended_actions": recommended_actions,
        }

    async def generate_multi_image_caption(
        self,
        image_bytes_list: List[bytes],
        prompt: str,
        metadata_instructions: str = "",
    ) -> Dict[str, Any]:
        """
        Generate caption for multiple images using HF Inference Providers (OpenAI-style chat).
        """
        if not self.api_key or not self.model_id:
            raise Exception("MODEL_UNAVAILABLE: HuggingFace credentials or model_id missing.")

        start_time = time.time()

        instruction = (prompt or "").strip()
        if metadata_instructions:
            instruction += "\n\n" + metadata_instructions.strip()

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        content = [{"type": "text", "text": instruction}]
        for image_bytes in image_bytes_list:
            mime = self._guess_mime(image_bytes)
            data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
            content.append({"type": "image_url", "image_url": {"url": data_url}})

        payload = {
            "model": self.model_id,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": 4096,
            "temperature": 0.2,
        }

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                async with session.post(
                    self.providers_url,
                    headers=headers,
                    json=payload,
                ) as resp:
                    raw_text = await resp.text()
                    if resp.status != 200:
                        raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} unavailable (HTTP {resp.status}).")
                    result = await resp.json()
        except Exception as e:
            if "MODEL_UNAVAILABLE" not in str(e):
                raise Exception(f"MODEL_UNAVAILABLE: {self.model_name} is unavailable due to a network/error.")
            raise

        message = (result.get("choices") or [{}])[0].get("message", {})
        content_out = message.get("content", "")

        if not content_out and message.get("reasoning_content"):
            content_out = message.get("reasoning_content", "")

        if isinstance(content_out, list):
            parts = []
            for block in content_out:
                if isinstance(block, dict):
                    parts.append(block.get("text") or block.get("content") or "")
                else:
                    parts.append(str(block))
            content_out = "\n".join([p for p in parts if p])

        caption = (content_out or "").strip()

        if caption.startswith("```json"):
            caption = re.sub(r"^```json\s*", "", caption)
            caption = re.sub(r"\s*```$", "", caption)
        
        # Strip GLM special tokens
        if caption.startswith("<|begin_of_box|>"):
            caption = caption[16:]  # Remove <|begin_of_box|>
        if caption.endswith("<|end_of_box|>"):
            caption = caption[:-15]  # Remove <|end_of_box|>

        metadata = {}
        description = ""
        analysis = caption
        recommended_actions = ""

        try:
            parsed = json.loads(caption)
            description = parsed.get("description", "")
            analysis = parsed.get("analysis", caption)
            recommended_actions = parsed.get("recommended_actions", "")
            metadata = parsed.get("metadata", {})
            caption_text = f"Description: {description}\n\nAnalysis: {analysis}\n\nRecommended Actions: {recommended_actions}"
        except json.JSONDecodeError:
            # If JSON parsing fails, treat the response as plain text analysis
            parsed = None
            description = ""
            analysis = caption
            recommended_actions = ""
            metadata = {}
            caption_text = caption
        
        # Fallback: if all structured fields are empty, put everything in analysis
        if not description and not recommended_actions and not metadata:
            analysis = caption
            caption_text = f"Description: \n\nAnalysis: {caption}\n\nRecommended Actions: "

        elapsed = time.time() - start_time

        return {
            "caption": caption_text,
            "metadata": metadata,
            "confidence": None,
            "processing_time": elapsed,
            "raw_response": {
                "model": self.model_id,
                "content": content_out,
                "metadata": metadata,
                "extracted_metadata": metadata,
                "parsed": parsed,
                "image_count": len(image_bytes_list),
            },
            "description": description,
            "analysis": analysis,
            "recommended_actions": recommended_actions,
        }


# --- Generic wrapper for easy dynamic registration ---
class ProvidersGenericVLMService(HuggingFaceService):
    """
    Generic wrapper so you can register ANY Providers VLM by model_id from config/DB.
    Example:
      ProvidersGenericVLMService(None, "Qwen/Qwen2.5-VL-32B-Instruct", "QWEN2_5_VL_32B")
    """
    def __init__(self, api_key: str, model_id: str, public_name: str | None = None):
        providers_url = "https://router.huggingface.co/v1/chat/completions"
        super().__init__(
            api_key=api_key,
            model_id=model_id,
            providers_url=providers_url,
            public_name=public_name or model_id.replace("/", "_").upper(),
        )
        if not self.api_key or not self.model_id:
            self.is_available = False
            self.status = ServiceStatus.DEGRADED
