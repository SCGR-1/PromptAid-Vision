# services/huggingface_service.py
from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import aiohttp
import base64
import json
import time
import re
import imghdr


class HuggingFaceService(VLMService):
    """
    Hugging Face Inference Providers (OpenAI-compatible) service.
    This class speaks to https://router.huggingface.co/v1/chat/completions
    so you can call many VLMs with the same payload shape.
    """

    def __init__(self, api_key: str, model_id: str = "Qwen/Qwen2.5-VL-7B-Instruct"):
        super().__init__(f"HF_{model_id.replace('/', '_')}", ModelType.CUSTOM)
        self.api_key = api_key
        self.model_id = model_id
        self.providers_url = "https://router.huggingface.co/v1/chat/completions"

    def _guess_mime(self, image_bytes: bytes) -> str:
        kind = imghdr.what(None, h=image_bytes)
        if kind == "png":
            return "image/png"
        if kind in ("jpg", "jpeg"):
            return "image/jpeg"
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
            metadata = parsed.get("metadata", {}) or {}
        except json.JSONDecodeError:
            # If not JSON, try to extract metadata from GLM thinking format
            if "<think>" in cleaned:
                analysis, metadata = self._extract_glm_metadata(cleaned)
            else:
                # Fallback: try to extract any structured information
                analysis = cleaned
                metadata = {}
        
        # Combine all three parts for backward compatibility
        caption_text = f"Description: {description}\n\nAnalysis: {analysis}\n\nRecommended Actions: {recommended_actions}"
        
        # Validate and clean metadata fields with sensible defaults
        if isinstance(metadata, dict):
            # Clean EPSG - default to "OTHER" if not in allowed values
            if metadata.get("epsg"):
                allowed = {"4326", "3857", "32617", "32633", "32634", "OTHER"}
                if str(metadata["epsg"]) not in allowed:
                    metadata["epsg"] = "OTHER"
            else:
                metadata["epsg"] = "OTHER"  # Default when missing
            
            # Clean source - default to "OTHER" if not recognized
            if metadata.get("source"):
                allowed_sources = {"PDC", "GDACS", "WFP", "GFH", "GGC", "USGS", "OTHER"}
                if str(metadata["source"]).upper() not in allowed_sources:
                    metadata["source"] = "OTHER"
            else:
                metadata["source"] = "OTHER"
            
            # Clean event type - default to "OTHER" if not recognized  
            if metadata.get("type"):
                allowed_types = {"BIOLOGICAL_EMERGENCY", "CHEMICAL_EMERGENCY", "CIVIL_UNREST", 
                               "COLD_WAVE", "COMPLEX_EMERGENCY", "CYCLONE", "DROUGHT", "EARTHQUAKE", 
                               "EPIDEMIC", "FIRE", "FLOOD", "FLOOD_INSECURITY", "HEAT_WAVE", 
                               "INSECT_INFESTATION", "LANDSLIDE", "OTHER", "PLUVIAL", 
                               "POPULATION_MOVEMENT", "RADIOLOGICAL_EMERGENCY", "STORM", 
                               "TRANSPORTATION_EMERGENCY", "TSUNAMI", "VOLCANIC_ERUPTION"}
                if str(metadata["type"]).upper() not in allowed_types:
                    metadata["type"] = "OTHER"
            else:
                metadata["type"] = "OTHER"
            
            # Ensure countries is always a list
            if not metadata.get("countries") or not isinstance(metadata.get("countries"), list):
                metadata["countries"] = []

        elapsed = time.time() - start_time
        return {
            "caption": caption_text,
            "metadata": metadata,
            "confidence": None,
            "processing_time": elapsed,
            "raw_response": {
                "model": self.model_id,
                "response": result,
                "parsed_successfully": bool(metadata),
            },
            "description": description,
            "analysis": analysis,
            "recommended_actions": recommended_actions
        }

    def _extract_glm_metadata(self, content: str) -> tuple[str, dict]:
        """
        Extract metadata from GLM thinking format using simple, robust patterns.
        Focus on extracting what we can and rely on defaults for the rest.
        """
        # Remove <think> tags
        content = re.sub(r'<think>|</think>', '', content)
        
        metadata = {}
        
        # Simple extraction - just look for key patterns, don't overthink it
        # Title: Look for quoted strings after "Maybe" or "Title"
        title_match = re.search(r'(?:Maybe|Title).*?["\']([^"\']{5,50})["\']', content, re.IGNORECASE)
        if title_match:
            metadata["title"] = title_match.group(1).strip()
        
        # Source: Look for common source names (WFP, PDC, etc.)
        source_match = re.search(r'\b(WFP|PDC|GDACS|GFH|GGC|USGS)\b', content, re.IGNORECASE)
        if source_match:
            metadata["source"] = source_match.group(1).upper()
        
        # Type: Look for disaster types
        disaster_types = ["EARTHQUAKE", "FLOOD", "CYCLONE", "DROUGHT", "FIRE", "STORM", "TSUNAMI", "VOLCANIC"]
        for disaster_type in disaster_types:
            if re.search(rf'\b{disaster_type}\b', content, re.IGNORECASE):
                metadata["type"] = disaster_type
                break
        
        # Countries: Look for 2-letter country codes
        country_matches = re.findall(r'\b([A-Z]{2})\b', content)
        valid_countries = []
        for match in country_matches:
            # Basic validation - exclude common false positives
            if match not in ["SO", "IS", "OR", "IN", "ON", "TO", "OF", "AT", "BY", "NO", "GO", "UP", "US"]:
                valid_countries.append(match)
        if valid_countries:
            metadata["countries"] = list(set(valid_countries))  # Remove duplicates
        
        # EPSG: Look for 4-digit numbers that could be EPSG codes
        epsg_match = re.search(r'\b(4326|3857|32617|32633|32634)\b', content)
        if epsg_match:
            metadata["epsg"] = epsg_match.group(1)
        
        # For caption, just use the first part before metadata discussion
        lines = content.split('\n')
        caption_lines = []
        for line in lines:
            if any(keyword in line.lower() for keyword in ['metadata:', 'now for the metadata', 'let me double-check']):
                break
            caption_lines.append(line)
        
        caption_text = '\n'.join(caption_lines).strip()
        if not caption_text:
            caption_text = content
        
        return caption_text, metadata


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

