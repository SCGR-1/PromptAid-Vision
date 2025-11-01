"""
Shared utilities for image operations
"""
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from .. import crud, storage

logger = logging.getLogger(__name__)

def convert_image_to_dict(img, image_url: str, url_cache: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Helper function to convert SQLAlchemy image model to dict for Pydantic
    
    Args:
        img: SQLAlchemy image model instance
        image_url: URL for the main image file
        url_cache: Optional dict to cache generated URLs by key, avoiding duplicate presigned URL generation
    """
    countries_list = []
    if hasattr(img, 'countries') and img.countries is not None:
        try:
            countries_list = [{"c_code": c.c_code, "label": c.label, "r_code": c.r_code} for c in img.countries]
        except Exception as e:
            logger.warning(f"Error processing countries for image {img.image_id}: {e}")
            countries_list = []
    
    captions_list = []
    if hasattr(img, 'captions') and img.captions is not None:
        try:
            captions_list = [
                {
                    "caption_id": c.caption_id,
                    "title": c.title,
                    "text": c.text,
                    "starred": c.starred,
                    "generated": c.generated,
                    "model": c.model,
                    "created_at": c.created_at,
                    "updated_at": c.updated_at
                } for c in img.captions
            ]
        except Exception as e:
            logger.warning(f"Error processing captions for image {img.image_id}: {e}")
            captions_list = []
    
    # Get starred status and other caption fields from first caption for backward compatibility
    starred = False
    title = None
    text = None
    generated = False
    model = None
    created_at = None
    updated_at = None
    
    if captions_list:
        first_caption = captions_list[0]
        starred = first_caption.get("starred", False)
        title = first_caption.get("title", "")
        text = first_caption.get("text", "")
        generated = first_caption.get("generated", False)
        model = first_caption.get("model", "")
        created_at = first_caption.get("created_at")
        updated_at = first_caption.get("updated_at")
    
    # Generate URLs for thumbnail and detail versions
    thumbnail_url = None
    detail_url = None
    
    if hasattr(img, 'thumbnail_key') and img.thumbnail_key:
        try:
            thumbnail_url = storage.get_object_url(img.thumbnail_key, cache=url_cache)
        except Exception as e:
            logger.warning(f"Error generating thumbnail URL for image {img.image_id}: {e}")
    
    if hasattr(img, 'detail_key') and img.detail_key:
        try:
            detail_url = storage.get_object_url(img.detail_key, cache=url_cache)
        except Exception as e:
            logger.warning(f"Error generating detail URL for image {img.image_id}: {e}")
    
    img_dict = {
        "image_id": img.image_id,
        "file_key": img.file_key,
        "sha256": img.sha256,
        "source": img.source,
        "event_type": img.event_type,
        "epsg": img.epsg,
        "image_type": img.image_type,
        "countries": countries_list,
        "captions": captions_list,
        "starred": starred,
        "title": title,
        "text": text,
        "generated": generated,
        "model": model,
        "created_at": created_at,
        "updated_at": updated_at,
        "url": image_url,
        "thumbnail_url": thumbnail_url,
        "detail_url": detail_url,
        # Drone-specific fields
        "center_lon": getattr(img, 'center_lon', None),
        "center_lat": getattr(img, 'center_lat', None),
        "amsl_m": getattr(img, 'amsl_m', None),
        "agl_m": getattr(img, 'agl_m', None),
        "heading_deg": getattr(img, 'heading_deg', None),
        "yaw_deg": getattr(img, 'yaw_deg', None),
        "pitch_deg": getattr(img, 'pitch_deg', None),
        "roll_deg": getattr(img, 'roll_deg', None),
        "rtk_fix": getattr(img, 'rtk_fix', None),
        "std_h_m": getattr(img, 'std_h_m', None),
        "std_v_m": getattr(img, 'std_v_m', None),
    }
    
    return img_dict
