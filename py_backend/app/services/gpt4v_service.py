from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import openai
import base64
import asyncio
import json
import re

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

class GPT4VService(VLMService):
    """GPT-4 Vision service implementation"""
    
    def __init__(self, api_key: str):
        super().__init__("GPT4V", ModelType.GPT4V)
        self.client = openai.OpenAI(api_key=api_key)
        self.model_name = "GPT-4O"
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        """Generate caption using GPT-4 Vision"""
        print(f"🔍 GPT-4V: Starting caption generation for {len(image_bytes)} bytes")
        print(f"🔍 GPT-4V: Prompt: {prompt[:100]}...")
        print(f"🔍 GPT-4V: Metadata instructions: {metadata_instructions[:100]}...")
        
        try:
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            print(f"🔍 GPT-4V: Image encoded to base64, length: {len(image_base64)}")
            
            print(f"🔍 GPT-4V: Calling OpenAI API with model: gpt-4o")
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt + "\n\n" + metadata_instructions},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=800
            )
            
            print(f"🔍 GPT-4V: API call successful, response received")
            content = response.choices[0].message.content
            print(f"🔍 GPT-4V: Raw content length: {len(content)}")
            
            cleaned_content = content.strip()
            if cleaned_content.startswith("```json"):
                cleaned_content = cleaned_content[7:]
            if cleaned_content.endswith("```"):
                cleaned_content = cleaned_content[:-3]
            cleaned_content = cleaned_content.strip()
            
            metadata = {}
            try:
                metadata = json.loads(cleaned_content)
                print(f"🔍 GPT-4V: JSON parsed successfully, metadata keys: {list(metadata.keys())}")
            except json.JSONDecodeError as e:
                print(f"⚠️ GPT-4V: JSON parse error: {e}")
                if "```json" in content:
                    json_start = content.find("```json") + 7
                    json_end = content.find("```", json_start)
                    if json_end > json_start:
                        json_str = content[json_start:json_end].strip()
                        try:
                            metadata = json.loads(json_str)
                            print(f"🔍 GPT-4V: Extracted JSON from code blocks successfully")
                        except json.JSONDecodeError as e2:
                            print(f"⚠️ GPT-4V: Code block JSON parse also failed: {e2}")
                else:
                    json_match = re.search(r'\{[^{}]*"metadata"[^{}]*\{[^{}]*\}', content)
                    if json_match:
                        try:
                            metadata = json.loads(json_match.group())
                            print(f"🔍 GPT-4V: Extracted JSON using regex successfully")
                        except json.JSONDecodeError as e3:
                            print(f"⚠️ GPT-4V: Regex JSON extraction failed: {e3}")
            
            print(f"🔍 GPT-4V: Caption generation completed successfully")
            
            return {
                "caption": cleaned_content,
                "raw_response": {
                    "content": cleaned_content,  # Use cleaned content instead of raw
                    "metadata": metadata,
                    "extracted_metadata": metadata
                },
                "metadata": metadata
            }
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"❌ GPT-4V: Error occurred during caption generation")
            print(f"❌ GPT-4V: Error type: {error_type}")
            print(f"❌ GPT-4V: Error message: {error_msg}")
            
            # Sanitize error message to remove sensitive information
            sanitized_error = sanitize_sensitive_data(error_msg)
            
            # Check for specific error types
            if "rate_limit" in error_msg.lower() or "quota" in error_msg.lower():
                print(f"❌ GPT-4V: Rate limit or quota exceeded detected")
                raise Exception(f"MODEL_UNAVAILABLE: GPT-4O is currently unavailable (rate limit/quota exceeded). Switching to another model.")
            elif "authentication" in error_msg.lower() or "invalid" in error_msg.lower() or "api_key" in error_msg.lower():
                print(f"❌ GPT-4V: Authentication or API key error detected")
                raise Exception(f"MODEL_UNAVAILABLE: GPT-4O is currently unavailable (authentication error). Switching to another model.")
            elif "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                print(f"❌ GPT-4V: Network timeout or connection error detected")
                raise Exception(f"MODEL_UNAVAILABLE: GPT-4O is currently unavailable (network error). Switching to another model.")
            else:
                print(f"❌ GPT-4V: Generic error, converting to MODEL_UNAVAILABLE")
                raise Exception(f"MODEL_UNAVAILABLE: GPT-4O is currently unavailable ({error_type}: {sanitized_error}). Switching to another model.") 