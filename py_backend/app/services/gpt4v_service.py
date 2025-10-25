from .vlm_service import VLMService, ModelType
from typing import Dict, Any, List
import openai
import base64
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

class GPT4VService(VLMService):
    """GPT-4 Vision service implementation"""
    
    def __init__(self, api_key: str):
        super().__init__("GPT4V", ModelType.GPT4V)
        logger.debug(f"Initializing with API key: {api_key[:10]}...{api_key[-4:] if api_key else 'None'}")
        self.client = openai.OpenAI(api_key=api_key)
        self.model_name = "GPT-4O"
        logger.info("Initialized successfully")
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        """Generate caption using GPT-4 Vision"""
        try:
            # Debug logging
            api_key_preview = self.client.api_key[:10] + "..." + self.client.api_key[-4:] if self.client.api_key else "None"
            logger.debug(f"API Key preview: {api_key_preview}")
            logger.debug(f"Image size: {len(image_bytes)} bytes")
            logger.debug(f"Prompt length: {len(prompt)} chars")
            
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            logger.debug(f"Making API call to OpenAI...")
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
            logger.info("API call successful!")
            
            content = response.choices[0].message.content
            
            cleaned_content = content.strip()
            if cleaned_content.startswith("```json"):
                cleaned_content = cleaned_content[7:]
            if cleaned_content.endswith("```"):
                cleaned_content = cleaned_content[:-3]
            cleaned_content = cleaned_content.strip()
            
            metadata = {}
            try:
                metadata = json.loads(cleaned_content)
            except json.JSONDecodeError:
                if "```json" in content:
                    json_start = content.find("```json") + 7
                    json_end = content.find("```", json_start)
                    if json_end > json_start:
                        json_str = content[json_start:json_end].strip()
                        try:
                            metadata = json.loads(json_str)
                        except json.JSONDecodeError as e:
                            logger.error(f"JSON parse error: {e}")
                else:
                    import re
                    json_match = re.search(r'\{[^{}]*"metadata"[^{}]*\{[^{}]*\}', content)
                    if json_match:
                        try:
                            metadata = json.loads(json_match.group())
                        except json.JSONDecodeError:
                            pass
            
            # Extract the three parts from the parsed JSON
            description = metadata.get("description", "")
            analysis = metadata.get("analysis", "")
            recommended_actions = metadata.get("recommended_actions", "")
            
            # Combine all three parts for backward compatibility
            combined_content = f"Description: {description}\n\nAnalysis: {analysis}\n\nRecommended Actions: {recommended_actions}"
            
            return {
                "caption": combined_content,
                "raw_response": {
                    "content": content, 
                    "metadata": metadata,
                    "extracted_metadata": metadata
                },
                "metadata": metadata,
                "description": description,
                "analysis": analysis,
                "recommended_actions": recommended_actions
            }
            
        except Exception as e:
            logger.error(f"API call failed: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'response'):
                logger.error(f"Response status: {getattr(e.response, 'status_code', 'Unknown')}")
                logger.error(f"Response body: {getattr(e.response, 'text', 'Unknown')}")
            raise Exception(f"GPT-4 Vision API error: {str(e)}")
    
    async def generate_multi_image_caption(self, image_bytes_list: List[bytes], prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        """Generate caption for multiple images using GPT-4 Vision"""
        try:
            # Create content array with text and multiple images
            content = [{"type": "text", "text": prompt + "\n\n" + metadata_instructions}]
            
            # Add each image to the content
            for i, image_bytes in enumerate(image_bytes_list):
                image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_base64}"
                    }
                })
            
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=1200  # Increased for multiple images
            )
            
            content = response.choices[0].message.content
            
            cleaned_content = content.strip()
            if cleaned_content.startswith("```json"):
                cleaned_content = cleaned_content[7:]
            if cleaned_content.endswith("```"):
                cleaned_content = cleaned_content[:-3]
            cleaned_content = cleaned_content.strip()
            
            metadata = {}
            try:
                metadata = json.loads(cleaned_content)
            except json.JSONDecodeError:
                if "```json" in content:
                    json_start = content.find("```json") + 7
                    json_end = content.find("```", json_start)
                    if json_end > json_start:
                        json_str = content[json_start:json_end].strip()
                        try:
                            metadata = json.loads(json_str)
                        except json.JSONDecodeError as e:
                            logger.error(f"JSON parse error: {e}")
                else:
                    import re
                    json_match = re.search(r'\{[^{}]*"metadata"[^{}]*\{[^{}]*\}', content)
                    if json_match:
                        try:
                            metadata = json.loads(json_match.group())
                        except json.JSONDecodeError:
                            pass
            
            # Extract the three parts from the parsed JSON
            description = metadata.get("description", "")
            analysis = metadata.get("analysis", "")
            recommended_actions = metadata.get("recommended_actions", "")
            
            # Combine all three parts for backward compatibility
            combined_content = f"Description: {description}\n\nAnalysis: {analysis}\n\nRecommended Actions: {recommended_actions}"
            
            return {
                "caption": combined_content,
                "raw_response": {
                    "content": content, 
                    "metadata": metadata,
                    "extracted_metadata": metadata,
                    "image_count": len(image_bytes_list)
                },
                "metadata": metadata,
                "description": description,
                "analysis": analysis,
                "recommended_actions": recommended_actions
            }
            
        except Exception as e:
            logger.error(f"API call failed: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            if hasattr(e, 'response'):
                logger.error(f"Response status: {getattr(e.response, 'status_code', 'Unknown')}")
                logger.error(f"Response body: {getattr(e.response, 'text', 'Unknown')}")
            raise Exception(f"GPT-4 Vision API error: {str(e)}") 