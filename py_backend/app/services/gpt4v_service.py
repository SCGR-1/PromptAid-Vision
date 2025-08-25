from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import openai
import base64
import asyncio
import json

class GPT4VService(VLMService):
    """GPT-4 Vision service implementation"""
    
    def __init__(self, api_key: str):
        super().__init__("GPT4V", ModelType.GPT4V)
        self.client = openai.OpenAI(api_key=api_key)
        self.model_name = "GPT-4O"
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        """Generate caption using GPT-4 Vision"""
        try:
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
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
                            print(f"JSON parse error: {e}")
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
            raise Exception(f"GPT-4 Vision API error: {str(e)}") 