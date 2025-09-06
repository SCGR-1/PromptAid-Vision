# app/services/vlm_services.py
from __future__ import annotations

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


class ServiceStatus(Enum):
    READY = "ready"
    DEGRADED = "degraded"     # registered but probe failed or not run
    UNAVAILABLE = "unavailable"


class VLMService(ABC):
    """Abstract base class for VLM services"""

    def __init__(self, model_name: str, model_type: ModelType, provider: str = "custom", lazy_init: bool = True):
        self.model_name = model_name
        self.model_type = model_type
        self.provider = provider
        self.lazy_init = lazy_init
        self.is_available = True            # quick flag used by manager for random selection
        self.status = ServiceStatus.DEGRADED
        self._initialized = False

    async def probe(self) -> bool:
        """
        Lightweight reachability/metadata check. Providers should override.
        Must be quick (<5s) and NEVER raise. Return True if reachable/ok.
        """
        return True

    async def ensure_ready(self) -> bool:
        """
        Called once before first use. Providers may override to open clients/warm caches.
        Must set _initialized True and return True on success. NEVER raise.
        """
        self._initialized = True
        self.status = ServiceStatus.READY
        return True

    @abstractmethod
    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        """Generate caption for an image"""
        ...

    # Optional for multi-image models; override in providers that support it.
    async def generate_multi_image_caption(self, image_bytes_list: List[bytes], prompt: str, metadata_instructions: str = "") -> Dict[str, Any]:
        raise NotImplementedError("Multi-image caption not implemented for this service")

    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "name": self.model_name,
            "type": self.model_type.value,
            "provider": self.provider,
            "available": self.is_available,
            "status": self.status.value,
            "lazy_init": self.lazy_init,
        }


class VLMServiceManager:
    """Manager for multiple VLM services"""

    def __init__(self):
        self.services: Dict[str, VLMService] = {}
        self.default_service: Optional[str] = None

    def register_service(self, service: VLMService):
        """
        Register a VLM service (NO network calls here).
        We’ll probe later, asynchronously, so registration never blocks startup.
        """
        self.services[service.model_name] = service
        if not self.default_service:
            self.default_service = service.model_name
        logger.info("Registered VLM service: %s (%s)", service.model_name, service.provider)

    async def probe_all(self):
        """
        Run lightweight probes for all registered services.
        Failures do not remove services; they stay DEGRADED and will lazy-init on first use.
        """
        for svc in self.services.values():
            try:
                ok = await svc.probe()
                svc.status = ServiceStatus.READY if ok else ServiceStatus.DEGRADED
                # If probe fails but lazy_init is allowed, keep is_available True so selection still works.
                svc.is_available = ok or svc.lazy_init
                logger.info("Probe %s -> %s", svc.model_name, svc.status.value)
            except Exception as e:
                logger.warning("Probe failed for %s: %r", svc.model_name, e)
                svc.status = ServiceStatus.DEGRADED
                svc.is_available = bool(svc.lazy_init)

    def get_service(self, model_name: str) -> Optional[VLMService]:
        """Get a specific VLM service"""
        return self.services.get(model_name)

    def get_default_service(self) -> Optional[VLMService]:
        """Get the default VLM service"""
        return self.services.get(self.default_service) if self.default_service else None

    def get_available_models(self) -> list:
        """Get list of available model names"""
        return list(self.services.keys())

    async def _pick_service(self, model_name: Optional[str], db_session) -> VLMService:
        # Specific pick
        service = None
        if model_name and model_name != "random":
            service = self.services.get(model_name)
            if not service:
                logger.warning("Model '%s' not found; will pick fallback", model_name)

        # Fallback / random based on DB allowlist (is_available==True)
        if not service and self.services:
            if db_session:
                try:
                    from .. import crud  # local import to avoid cycles at import time
                    available_models = crud.get_models(db_session)
                    allowed = {m.m_code for m in available_models if getattr(m, "is_available", False)}
                    
                    # Check for configured fallback model first
                    configured_fallback = crud.get_fallback_model(db_session)
                    if configured_fallback and configured_fallback in allowed:
                        fallback_service = self.services.get(configured_fallback)
                        if fallback_service and fallback_service.is_available:
                            logger.info("Using configured fallback model: %s", configured_fallback)
                            service = fallback_service
                    
                    # If no configured fallback or it's not available, use STUB_MODEL as final fallback
                    if not service:
                        service = self.services.get("STUB_MODEL") or next(iter(self.services.values()))
                        logger.info("Using STUB_MODEL as final fallback")
                except Exception as e:
                    logger.warning("DB availability check failed: %r; using first available", e)
                    avail = [s for s in self.services.values() if s.is_available]
                    service = (self.services.get("STUB_MODEL") or (random.choice(avail) if avail else next(iter(self.services.values()))))
            else:
                import random
                avail = [s for s in self.services.values() if s.is_available]
                service = (random.choice(avail) if avail else (self.services.get("STUB_MODEL") or next(iter(self.services.values()))))

        if not service:
            raise RuntimeError("No VLM service available")

        # Lazy init on first use
        if service.lazy_init and not service._initialized:
            try:
                ok = await service.ensure_ready()
                service.status = ServiceStatus.READY if ok else ServiceStatus.DEGRADED
            except Exception as e:
                logger.warning("ensure_ready failed for %s: %r", service.model_name, e)
                service.status = ServiceStatus.DEGRADED

        return service

    async def generate_caption(self, image_bytes: bytes, prompt: str, metadata_instructions: str = "", model_name: str | None = None, db_session=None) -> dict:
        """Generate caption using the specified model or fallback to available service."""
        service = await self._pick_service(model_name, db_session)
        try:
            result = await service.generate_caption(image_bytes, prompt, metadata_instructions)
            result["model"] = service.model_name
            return result
        except Exception as e:
            logger.error("Error with %s: %r; trying fallbacks", service.model_name, e)
            
            # First, try the configured fallback model if available
            if db_session:
                try:
                    from .. import crud
                    configured_fallback = crud.get_fallback_model(db_session)
                    if configured_fallback and configured_fallback != service.model_name:
                        fallback_service = self.services.get(configured_fallback)
                        if fallback_service and fallback_service.is_available:
                            logger.info("Trying configured fallback model: %s", configured_fallback)
                            try:
                                if fallback_service.lazy_init and not fallback_service._initialized:
                                    await fallback_service.ensure_ready()
                                res = await fallback_service.generate_caption(image_bytes, prompt, metadata_instructions)
                                res.update({
                                    "model": fallback_service.model_name,
                                    "fallback_used": True,
                                    "original_model": service.model_name,
                                    "fallback_reason": str(e),
                                })
                                logger.info("Configured fallback model %s succeeded", configured_fallback)
                                return res
                            except Exception as fe:
                                logger.warning("Configured fallback service %s also failed: %r", configured_fallback, fe)
                except Exception as db_error:
                    logger.warning("Failed to get configured fallback: %r", db_error)
            
            # If configured fallback failed or not available, try STUB_MODEL
            stub_service = self.services.get("STUB_MODEL")
            if stub_service and stub_service != service.model_name:
                logger.info("Trying STUB_MODEL as final fallback")
                try:
                    if stub_service.lazy_init and not stub_service._initialized:
                        await stub_service.ensure_ready()
                    res = await stub_service.generate_caption(image_bytes, prompt, metadata_instructions)
                    res.update({
                        "model": stub_service.model_name,
                        "fallback_used": True,
                        "original_model": service.model_name,
                        "fallback_reason": str(e),
                    })
                    logger.info("STUB_MODEL succeeded as final fallback")
                    return res
                except Exception as fe:
                    logger.warning("STUB_MODEL also failed: %r", fe)
            
            # All services failed
            raise RuntimeError(f"All VLM services failed. Last error from {service.model_name}: {e}")

    async def generate_multi_image_caption(self, image_bytes_list: List[bytes], prompt: str, metadata_instructions: str = "", model_name: str | None = None, db_session=None) -> dict:
        """Multi-image version if a provider supports it."""
        service = await self._pick_service(model_name, db_session)
        try:
            result = await service.generate_multi_image_caption(image_bytes_list, prompt, metadata_instructions)
            result["model"] = service.model_name
            return result
        except Exception as e:
            logger.error("Error with %s (multi): %r; trying fallbacks", service.model_name, e)
            for other in self.services.values():
                if other is service:
                    continue
                try:
                    if other.lazy_init and not other._initialized:
                        await other.ensure_ready()
                    res = await other.generate_multi_image_caption(image_bytes_list, prompt, metadata_instructions)
                    res.update({
                        "model": other.model_name,
                        "fallback_used": True,
                        "original_model": service.model_name,
                        "fallback_reason": str(e),
                    })
                    return res
                except Exception:
                    continue
            raise RuntimeError(f"All VLM services failed (multi). Last error from {service.model_name}: {e}")


# Global manager instance (as in your current code)
vlm_manager = VLMServiceManager()
