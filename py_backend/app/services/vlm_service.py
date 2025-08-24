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
        print(f"🚀 VLM Manager: Starting caption generation")
        print(f"🚀 VLM Manager: Requested model: {model_name}")
        print(f"🚀 VLM Manager: Available services: {[s.model_name for s in self.services.values()]}")
        print(f"🚀 VLM Manager: Total services: {len(self.services)}")
        
        # Select initial service
        service = None
        if model_name:
            print(f"🚀 VLM Manager: Looking for requested model: {model_name}")
            service = self.services.get(model_name)
            if service:
                print(f"🚀 VLM Manager: Found requested model: {service.model_name}")
            else:
                print(f"⚠️ VLM Manager: Requested model {model_name} not found in services")
        
        if not service:
            print(f"🚀 VLM Manager: No specific model requested, selecting from available services")
            if db_session:
                try:
                    from .. import crud
                    available_models = crud.get_models(db_session)
                    available_model_codes = [m.m_code for m in available_models if m.is_available]
                    print(f"🚀 VLM Manager: Available models from DB: {available_model_codes}")
                    
                    available_services = [s for s in self.services.values() if s.model_name in available_model_codes]
                    if available_services:
                        import random
                        shuffled_services = available_services.copy()
                        random.shuffle(shuffled_services)
                        service = shuffled_services[0]
                        print(f"🚀 VLM Manager: Randomly selected service: {service.model_name} (from {len(available_services)} available)")
                        print(f"🚀 VLM Manager: All available services were: {[s.model_name for s in available_services]}")
                        print(f"🚀 VLM Manager: Shuffled order: {[s.model_name for s in shuffled_services]}")
                    else:
                        print(f"⚠️ VLM Manager: No available services from DB, using fallback")
                        service = next(iter(self.services.values()))
                        print(f"🚀 VLM Manager: Using fallback service: {service.model_name}")
                except Exception as e:
                    print(f"❌ VLM Manager: Error checking database availability: {e}, using fallback")
                    service = next(iter(self.services.values()))
                    print(f"🚀 VLM Manager: Using fallback service: {service.model_name}")
            else:
                print(f"🚀 VLM Manager: No database session, using service property")
                available_services = [s for s in self.services.values() if s.is_available]
                if available_services:
                    import random
                    service = random.choice(available_services)
                    print(f"🚀 VLM Manager: Randomly selected service: {service.model_name}")
                else:
                    print(f"⚠️ VLM Manager: No available services, using fallback")
                    service = next(iter(self.services.values()))
                    print(f"🚀 VLM Manager: Using fallback service: {service.model_name}")
        
        if not service:
            raise ValueError("No VLM services available")
        
        print(f"🚀 VLM Manager: Initial service selected: {service.model_name}")
        
        # Track attempts to avoid infinite loops
        attempted_services = set()
        max_attempts = len(self.services)
        
        while len(attempted_services) < max_attempts:
            try:
                print(f"🚀 VLM Manager: Attempting with service: {service.model_name}")
                print(f"🚀 VLM Manager: Attempt #{len(attempted_services) + 1}/{max_attempts}")
                
                result = await service.generate_caption(image_bytes, prompt, metadata_instructions)
                if isinstance(result, dict):
                    result["model"] = service.model_name
                    result["fallback_used"] = len(attempted_services) > 0
                    if len(attempted_services) > 0:
                        result["original_model"] = model_name
                        result["fallback_reason"] = "model_unavailable"
                        print(f"✅ VLM Manager: Fallback successful: {model_name} -> {service.model_name}")
                    else:
                        print(f"✅ VLM Manager: Primary service successful: {service.model_name}")
                return result
            except Exception as e:
                error_str = str(e)
                print(f"❌ VLM Manager: Error with service {service.model_name}: {error_str}")
                
                # Check if it's a model unavailable error (any type of error)
                if "MODEL_UNAVAILABLE" in error_str:
                    attempted_services.add(service.model_name)
                    print(f"🔄 VLM Manager: Model {service.model_name} is unavailable, trying another service...")
                    print(f"🔄 VLM Manager: Attempted services so far: {attempted_services}")
                    
                    # Extract provider error details if available
                    provider_error_details = {}
                    if "Provider details:" in error_str:
                        try:
                            # Extract the provider details section
                            details_start = error_str.find("Provider details:") + len("Provider details:")
                            details_str = error_str[details_start:].strip()
                            if details_str.startswith("{") and details_str.endswith("}"):
                                import json
                                provider_error_details = json.loads(details_str)
                                print(f"🔍 VLM Manager: Provider Error Details: {provider_error_details}")
                        except Exception as parse_error:
                            print(f"⚠️ VLM Manager: Could not parse provider error details: {parse_error}")
                    
                    # Log specific error information
                    if provider_error_details:
                        provider = provider_error_details.get("provider", "unknown")
                        status_code = provider_error_details.get("status_code")
                        error_type = provider_error_details.get("error_type")
                        error_message = provider_error_details.get("error_message")
                        
                        print(f"🔍 VLM Manager: {service.model_name} failed with {provider} error:")
                        print(f"   Status Code: {status_code}")
                        print(f"   Error Type: {error_type}")
                        print(f"   Error Message: {error_message}")
                        
                        # Log specific error patterns
                        if status_code == 400:
                            print(f"🔍 VLM Manager: HTTP 400 detected - likely request format issue")
                        elif status_code == 401:
                            print(f"🔍 VLM Manager: HTTP 401 detected - authentication issue")
                        elif status_code == 403:
                            print(f"🔍 VLM Manager: HTTP 403 detected - access forbidden")
                        elif status_code == 429:
                            print(f"🔍 VLM Manager: HTTP 429 detected - rate limit exceeded")
                        elif status_code == 500:
                            print(f"🔍 VLM Manager: HTTP 500 detected - server error")
                    
                    # Try to find another available service
                    if db_session:
                        try:
                            from .. import crud
                            available_models = crud.get_models(db_session)
                            available_model_codes = [m.m_code for m in available_models if m.is_available]
                            print(f"🔄 VLM Manager: Available models from DB: {available_model_codes}")
                            
                            # Find next available service that hasn't been attempted
                            for next_service in self.services.values():
                                if (next_service.model_name in available_model_codes and 
                                    next_service.model_name not in attempted_services):
                                    service = next_service
                                    print(f"🔄 VLM Manager: Switching to fallback service: {service.model_name}")
                                    break
                            else:
                                print(f"⚠️ VLM Manager: No more available services from DB, using any untried service")
                                # No more available services, use any untried service
                                for next_service in self.services.values():
                                    if next_service.model_name not in attempted_services:
                                        service = next_service
                                        print(f"🔄 VLM Manager: Using untried service as fallback: {service.model_name}")
                                        break
                        except Exception as db_error:
                            print(f"❌ VLM Manager: Error checking database availability: {db_error}")
                            # Fallback to any untried service
                            for next_service in self.services.values():
                                if next_service.model_name not in attempted_services:
                                    service = next_service
                                    print(f"🔄 VLM Manager: Using untried service as fallback: {service.model_name}")
                                    break
                    else:
                        print(f"🔄 VLM Manager: No database session, using any untried service")
                        # No database session, use any untried service
                        for next_service in self.services.values():
                            if next_service.model_name not in attempted_services:
                                service = next_service
                                print(f"🔄 VLM Manager: Using untried service as fallback: {service.model_name}")
                                break
                    
                    if not service:
                        print(f"❌ VLM Manager: No more VLM services available after model failures")
                        raise ValueError("No more VLM services available after model failures")
                    
                    continue  # Try again with new service
                else:
                    # Non-model-unavailable error, don't retry
                    print(f"❌ VLM Manager: Non-model-unavailable error, not retrying: {error_str}")
                    raise
        
        # If we get here, we've tried all services
        print(f"❌ VLM Manager: All VLM services failed due to model unavailability")
        print(f"❌ VLM Manager: Attempted services: {attempted_services}")
        raise ValueError("All VLM services failed due to model unavailability")

vlm_manager = VLMServiceManager() 