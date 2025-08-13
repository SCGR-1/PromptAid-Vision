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
            
            return {
                "caption": cleaned_content,
                "raw_response": {
                    "content": content, 
                    "metadata": metadata,
                    "extracted_metadata": metadata
                },
                "metadata": metadata
            }
            
        except Exception as e:
            raise Exception(f"GPT-4 Vision API error: {str(e)}") 