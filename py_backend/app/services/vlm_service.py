from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class ModelType(Enum):
    """Enum for different VLM model types"""
    GPT4V = "gpt4v"
    CLAUDE_3_5_SONNET = "claude_3_5_sonnet"
    GEMINI_PRO_VISION = "gemini_pro_vision"
    LLAMA_VISION = "llama_vision"
    CUSTOM = "custom"

class VLMService(ABC):
    """Abstract base class for VLM services"""
    
    def __init__(self, model_name: str, model_type: ModelType):
        self.model_name = model_name
        self.model_type = model_type
        self.is_available = True
    
    @abstractmethod
    async def generate_caption(self, image_bytes: bytes, prompt: str) -> Dict[str, Any]:
        """Generate caption for an image"""
        pass
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "name": self.model_name,
            "type": self.model_type.value,
            "available": self.is_available,
        }

class VLMServiceManager:
    """Manager for multiple VLM services"""
    
    def __init__(self):
        self.services: Dict[str, VLMService] = {}
        self.default_service: Optional[str] = None
    
    def register_service(self, service: VLMService):
        """Register a VLM service"""
        self.services[service.model_name] = service
        if not self.default_service:
            self.default_service = service.model_name
        logger.info(f"Registered VLM service: {service.model_name}")
    
    def get_service(self, model_name: str) -> Optional[VLMService]:
        """Get a specific VLM service"""
        return self.services.get(model_name)
    
    def get_default_service(self) -> Optional[VLMService]:
        """Get the default VLM service"""
        if self.default_service:
            return self.services.get(self.default_service)
        return None
    
    def get_available_models(self) -> list:
        """Get list of available model names"""
        return list(self.services.keys())
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, model_name: str | None = None) -> dict:
        """Generate caption using the specified model or fallback to available service."""
        
        service = None
        if model_name:
            service = self.services.get(model_name)
            if not service:
                print(f"Model '{model_name}' not found, using fallback")
        
        if not service and self.services:
            service = next(iter(self.services.values()))
            print(f"Using fallback service: {service.model_name}")
        
        if not service:
            raise ValueError("No VLM services available")
        
        try:
            result = await service.generate_caption(image_bytes, prompt)
            if isinstance(result, dict):
                result["model"] = service.model_name
            return result
        except Exception as e:
            print(f"Error generating caption: {str(e)}")
            raise

vlm_manager = VLMServiceManager() 