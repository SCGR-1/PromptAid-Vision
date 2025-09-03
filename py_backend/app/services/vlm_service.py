from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
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
        """Generate caption using the specified model or fallback to available service."""
        
        service = None
        if model_name and model_name != "random":
            service = self.services.get(model_name)
            if not service:
                print(f"Model '{model_name}' not found, using fallback")
        
        if not service and self.services:
            # If random is selected or no specific model, choose a random available service
            if db_session:
                # Check database availability for random selection
                try:
                    from .. import crud
                    available_models = crud.get_models(db_session)
                    available_model_codes = [m.m_code for m in available_models if m.is_available]
                    
                    print(f"DEBUG: Available models in database: {available_model_codes}")
                    print(f"DEBUG: Registered services: {list(self.services.keys())}")
                    
                    # Filter services to only those marked as available in database
                    available_services = [s for s in self.services.values() if s.model_name in available_model_codes]
                    
                    print(f"DEBUG: Available services after filtering: {[s.model_name for s in available_services]}")
                    print(f"DEBUG: Service model names: {[s.model_name for s in self.services.values()]}")
                    print(f"DEBUG: Database model codes: {available_model_codes}")
                    print(f"DEBUG: Intersection check: {[s.model_name for s in self.services.values() if s.model_name in available_model_codes]}")
                    
                    if available_services:
                        import random
                        import time
                        # Use current time as seed for better randomness
                        random.seed(int(time.time() * 1000000) % 1000000)
                        
                        # Shuffle the list first for better randomization
                        shuffled_services = available_services.copy()
                        random.shuffle(shuffled_services)
                        
                        service = shuffled_services[0]
                        print(f"Randomly selected service: {service.model_name} (from {len(available_services)} available)")
                        print(f"DEBUG: All available services were: {[s.model_name for s in available_services]}")
                        print(f"DEBUG: Shuffled order: {[s.model_name for s in shuffled_services]}")
                    else:
                        # Fallback to any available service, prioritizing STUB_MODEL
                        print(f"WARNING: No services found in database intersection, using fallback")
                        if "STUB_MODEL" in self.services:
                            service = self.services["STUB_MODEL"]
                            print(f"Using STUB_MODEL fallback service: {service.model_name}")
                        else:
                            service = next(iter(self.services.values()))
                            print(f"Using first available fallback service: {service.model_name}")
                except Exception as e:
                    print(f"Error checking database availability: {e}, using fallback")
                    if "STUB_MODEL" in self.services:
                        service = self.services["STUB_MODEL"]
                        print(f"Using STUB_MODEL fallback service: {service.model_name}")
                    else:
                        service = next(iter(self.services.values()))
                        print(f"Using fallback service: {service.model_name}")
            else:
                # No database session, use service property
                available_services = [s for s in self.services.values() if s.is_available]
                if available_services:
                    import random
                    service = random.choice(available_services)
                    print(f"Randomly selected service: {service.model_name}")
                else:
                    # Fallback to any available service, prioritizing STUB_MODEL
                    if "STUB_MODEL" in self.services:
                        service = self.services["STUB_MODEL"]
                        print(f"Using STUB_MODEL fallback service: {service.model_name}")
                    else:
                        service = next(iter(self.services.values()))
                        print(f"Using fallback service: {service.model_name}")
        
        if not service:
            raise Exception("No VLM service available")
        
        print(f"DEBUG: Selected service for caption generation: {service.model_name}")
        
        try:
            print(f"DEBUG: Calling service {service.model_name} for caption generation")
            result = await service.generate_caption(image_bytes, prompt, metadata_instructions)
            result["model"] = service.model_name
            print(f"DEBUG: Service {service.model_name} returned result with model: {result.get('model', 'NOT_FOUND')}")
            return result
        except Exception as e:
            print(f"Error with {service.model_name}: {e}")
            # Try other services
            for other_service in self.services.values():
                if other_service != service:
                    try:
                        result = await other_service.generate_caption(image_bytes, prompt, metadata_instructions)
                        result["model"] = other_service.model_name
                        result["fallback_used"] = True
                        result["original_model"] = service.model_name
                        result["fallback_reason"] = str(e)
                        return result
                    except Exception as fallback_error:
                        print(f"Fallback service {other_service.model_name} also failed: {fallback_error}")
                        continue
            
            # All services failed
            raise Exception(f"All VLM services failed. Last error: {str(e)}")
    
    async def generate_multi_image_caption(self, image_bytes_list: List[bytes], prompt: str, metadata_instructions: str = "", model_name: str | None = None, db_session = None) -> dict:
        """Generate caption for multiple images using the specified model or fallback to available service."""
        
        service = None
        if model_name and model_name != "random":
            service = self.services.get(model_name)
            if not service:
                print(f"Model '{model_name}' not found, using fallback")
        
        if not service and self.services:
            # If random is selected or no specific model, choose a random available service
            if db_session:
                # Check database availability for random selection
                try:
                    from .. import crud
                    available_models = crud.get_models(db_session)
                    available_model_codes = [m.m_code for m in available_models if m.is_available]
                    
                    print(f"DEBUG: Available models in database: {available_model_codes}")
                    print(f"DEBUG: Registered services: {list(self.services.keys())}")
                    
                    # Filter services to only those marked as available in database
                    available_services = [s for s in self.services.values() if s.model_name in available_model_codes]
                    
                    print(f"DEBUG: Available services after filtering: {[s.model_name for s in available_services]}")
                    
                    if available_services:
                        import random
                        import time
                        # Use current time as seed for better randomness
                        random.seed(int(time.time() * 1000000) % 1000000)
                        
                        # Shuffle the list first for better randomization
                        shuffled_services = available_services.copy()
                        random.shuffle(shuffled_services)
                        
                        service = shuffled_services[0]
                        print(f"Randomly selected service: {service.model_name} (from {len(available_services)} available)")
                        print(f"DEBUG: All available services were: {[s.model_name for s in available_services]}")
                        print(f"DEBUG: Shuffled order: {[s.model_name for s in shuffled_services]}")
                    else:
                        # Fallback to any service
                        service = next(iter(self.services.values()))
                        print(f"Using fallback service: {service.model_name}")
                except Exception as e:
                    print(f"Error checking database availability: {e}, using fallback")
                    service = next(iter(self.services.values()))
                    print(f"Using fallback service: {service.model_name}")
            else:
                # No database session, use service property
                available_services = [s for s in self.services.values() if s.is_available]
                if available_services:
                    import random
                    service = random.choice(available_services)
                    print(f"Randomly selected service: {service.model_name}")
                else:
                    service = next(iter(self.services.values()))
                    print(f"Using fallback service: {service.model_name}")
        
        if not service:
            raise Exception("No VLM service available")
        
        try:
            result = await service.generate_multi_image_caption(image_bytes_list, prompt, metadata_instructions)
            result["model"] = service.model_name
            return result
        except Exception as e:
            print(f"Error with {service.model_name}: {e}")
            # Try other services
            for other_service in self.services.values():
                if other_service != service:
                    try:
                        result = await other_service.generate_multi_image_caption(image_bytes_list, prompt, metadata_instructions)
                        result["model"] = other_service.model_name
                        result["fallback_used"] = True
                        result["original_model"] = service.model_name
                        result["fallback_reason"] = str(e)
                        return result
                    except Exception as fallback_error:
                        print(f"Fallback service {other_service.model_name} also failed: {fallback_error}")
                        continue
            
            # All services failed
            raise Exception(f"All VLM services failed. Last error: {str(e)}")

vlm_manager = VLMServiceManager() 