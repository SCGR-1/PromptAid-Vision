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
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
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
    
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "", model_name: str | None = None, db_session = None) -> dict:
        """Generate caption using available VLM services with fallback"""
        
        # Select initial service
        service = None
        if model_name:
            service = self.services.get(model_name)
        
        if not service:
            if db_session:
                try:
                    from .. import crud
                    available_models = crud.get_models(db_session)
                    available_model_codes = [m.m_code for m in available_models if m.is_available]
                    
                    available_services = [s for s in self.services.values() if s.model_name in available_model_codes]
                    if available_services:
                        import random
                        shuffled_services = available_services.copy()
                        random.shuffle(shuffled_services)
                        service = shuffled_services[0]
                    else:
                        service = next(iter(self.services.values()))
                except Exception as e:
                    service = next(iter(self.services.values()))
            else:
                available_services = [s for s in self.services.values() if s.is_available]
                if available_services:
                    import random
                    service = random.choice(available_services)
                else:
                    service = next(iter(self.services.values()))
        
        if not service:
            raise ValueError("No VLM services available")
        
        # Track attempts to avoid infinite loops
        attempted_services = set()
        max_attempts = len(self.services)
        
        while len(attempted_services) < max_attempts:
            try:
                result = await service.generate_caption(image_bytes, prompt, metadata_instructions)
                if isinstance(result, dict):
                    result["model"] = service.model_name
                    result["fallback_used"] = len(attempted_services) > 0
                    if len(attempted_services) > 0:
                        result["original_model"] = model_name
                        result["fallback_reason"] = "model_unavailable"
                return result
            except Exception as e:
                error_str = str(e)
                
                # Check if it's a model unavailable error (any type of error)
                if "MODEL_UNAVAILABLE" in error_str:
                    attempted_services.add(service.model_name)
                    
                    # Try to find another available service
                    if db_session:
                        try:
                            from .. import crud
                            available_models = crud.get_models(db_session)
                            available_model_codes = [m.m_code for m in available_models if m.is_available]
                            
                            # Find next available service that hasn't been attempted
                            for next_service in self.services.values():
                                if (next_service.model_name in available_model_codes and 
                                    next_service.model_name not in attempted_services):
                                    service = next_service
                                    break
                            else:
                                # No more available services, use any untried service
                                for next_service in self.services.values():
                                    if next_service.model_name not in attempted_services:
                                        service = next_service
                                        break
                        except Exception as db_error:
                            # Fallback to any untried service
                            for next_service in self.services.values():
                                if next_service.model_name not in attempted_services:
                                    service = next_service
                                    break
                    else:
                        # No database session, use any untried service
                        for next_service in self.services.values():
                            if next_service.model_name not in attempted_services:
                                service = next_service
                                break
                    
                    if not service:
                        raise ValueError("No more VLM services available after model failures")
                    
                    continue  # Try again with new service
                else:
                    # Non-model-unavailable error, don't retry
                    raise
        
        # If we get here, we've tried all services
        raise ValueError("All VLM services failed due to model unavailability")

vlm_manager = VLMServiceManager() 