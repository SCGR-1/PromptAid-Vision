from .vlm_service import VLMService, ModelType
from typing import Dict, Any
import openai
import base64
import io
import asyncio
from PIL import Image

class GPT4VService(VLMService):
    """GPT-4 Vision service implementation"""
    
    def __init__(self, api_key: str):
        super().__init__("GPT4V", ModelType.GPT4V)
        self.client = openai.OpenAI(api_key=api_key)
        self.model_name = "GPT-4O"
    
    async def generate_caption(self, image_bytes: bytes, prompt: str) -> Dict[str, Any]:
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
                            {"type": "text", "text": prompt + "\n\nAdditionally, extract the following metadata in JSON format. Choose exactly ONE option from each category:\n\n" +
                                "- title: Create a concise title (less than 10 words) for the crisis/event\n" +
                                "- source: Choose ONE from: PDC, GDACS, WFP, GFH, GGC, USGS, OTHER\n" +
                                "- type: Choose ONE from: BIOLOGICAL_EMERGENCY, CHEMICAL_EMERGENCY, CIVIL_UNREST, COLD_WAVE, COMPLEX_EMERGENCY, CYCLONE, DROUGHT, EARTHQUAKE, EPIDEMIC, FIRE, FLOOD, FLOOD_INSECURITY, HEAT_WAVE, INSECT_INFESTATION, LANDSLIDE, OTHER, PLUVIAL, POPULATION_MOVEMENT, RADIOLOGICAL_EMERGENCY, STORM, TRANSPORTATION_EMERGENCY, TSUNAMI, VOLCANIC_ERUPTION\n" +
                                "- countries: List of affected country codes (ISO 2-letter codes like PA, US, etc.)\n" +
                                                                     "- epsg: Choose ONE from: 4326, 3857, 32617, 32633, 32634, OTHER. If the map shows a different EPSG code, use \"OTHER\"\n\n" +
                                "If you cannot find a match, use \"OTHER\". Return ONLY the JSON object (no markdown formatting) in this exact format:\n" +
                                "{\n" +
                                "  \"analysis\": \"detailed description...\",\n" +
                                "  \"metadata\": {\n" +
                                "    \"title\": \"...\",\n" +
                                "    \"source\": \"...\",\n" +
                                "    \"type\": \"...\",\n" +
                                "    \"countries\": [\"...\"],\n" +
                                "    \"epsg\": \"...\"\n" +
                                "  }\n" +
                                "}"},
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
            print(f"DEBUG: Raw AI response: {content[:200]}...")
            
            import json
            import re
            
            cleaned_content = content
            if content.startswith('```json'):
                cleaned_content = re.sub(r'^```json\s*', '', content)
                cleaned_content = re.sub(r'\s*```$', '', cleaned_content)
                print(f"DEBUG: Cleaned content: {cleaned_content[:200]}...")
            
            try:
                parsed = json.loads(cleaned_content)
                caption = parsed.get("analysis", content)
                metadata = parsed.get("metadata", {})
                
                if metadata.get("epsg"):
                    epsg_value = metadata["epsg"]
                    allowed_epsg = ["4326", "3857", "32617", "32633", "32634", "OTHER"]
                    if epsg_value not in allowed_epsg:
                        print(f"DEBUG: Invalid EPSG value '{epsg_value}', setting to 'OTHER'")
                        metadata["epsg"] = "OTHER"
                
                print(f"DEBUG: Successfully parsed JSON, metadata: {metadata}")
            except json.JSONDecodeError as e:
                print(f"DEBUG: JSON parse error: {e}")
                caption = content
                metadata = {}
            
            return {
                "caption": caption,
                "metadata": metadata,
                "confidence": 0.9,
                "processing_time": 0.0,
                "raw_response": {
                    "model": "gpt-4o",
                    "usage": response.usage.dict() if response.usage else None,
                    "finish_reason": response.choices[0].finish_reason
                }
            }
            
        except Exception as e:
            raise Exception(f"GPT-4 Vision API error: {str(e)}") 