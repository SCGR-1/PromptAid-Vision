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
    
    def get_available_models(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all available models"""
        return {
            name: service.get_model_info() 
            for name, service in self.services.items()
        }
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, model_name: str = None) -> Dict[str, Any]:
        """Generate caption using specified or default model"""
        print(f"DEBUG: VLM Manager: Looking for model_name: {model_name}")
        print(f"DEBUG: VLM Manager: Available services: {list(self.services.keys())}")
        
        service = None
        if model_name:
            service = self.get_service(model_name)
            print(f"DEBUG: VLM Manager: Found service for {model_name}: {service is not None}")
            if not service:
                raise ValueError(f"Model {model_name} not found")
        else:
            service = self.get_default_service()
            if not service:
                raise ValueError("No default model available")
        
        if not service.is_available:
            raise ValueError(f"Model {service.model_name} is not available")
        
        print(f"DEBUG: VLM Manager: Using service: {service.model_name}")
        
        try:
            print(f"DEBUG: VLM Manager: Calling generate_caption on {service.model_name}")
            result = await service.generate_caption(image_bytes, prompt)
            result["model"] = service.model_name
            print(f"DEBUG: VLM Manager: Successfully generated caption with {service.model_name}")
            return result
        except Exception as e:
            print(f"DEBUG: VLM Manager: Error generating caption with {service.model_name}: {str(e)}")
            import traceback
            traceback.print_exc()
            logger.error(f"Error generating caption with {service.model_name}: {str(e)}")
            raise

# Global service manager instance
vlm_manager = VLMServiceManager() 