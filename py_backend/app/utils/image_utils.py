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
                    "prompt": c.prompt,
                    "model": c.model,
                    "schema_id": c.schema_id,
                    "raw_json": c.raw_json,
                    "generated": c.generated,
                    "edited": c.edited,
                    "accuracy": c.accuracy,
                    "context": c.context,
                    "usability": c.usability,
                    "starred": c.starred if c.starred is not None else False,
                    "image_count": getattr(c, "image_count", None),
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
    prompt = None
    model = None
    schema_id = None
    raw_json = None
    generated = None
    edited = None
    accuracy = None
    context = None
    usability = None
    created_at = None
    updated_at = None
    
    if captions_list:
        first_caption = captions_list[0]
        starred = first_caption.get("starred", False)
        title = first_caption.get("title")
        prompt = first_caption.get("prompt")
        model = first_caption.get("model")
        schema_id = first_caption.get("schema_id")
        raw_json = first_caption.get("raw_json")
        generated = first_caption.get("generated")
        edited = first_caption.get("edited")
        accuracy = first_caption.get("accuracy")
        context = first_caption.get("context")
        usability = first_caption.get("usability")
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
    
    # Compute multi-upload metadata from primary caption
    image_count = None
    all_image_ids = None
    if img.captions:
        primary_caption = img.captions[0]
        # Use image_count if available and positive, otherwise count images
        if hasattr(primary_caption, 'image_count') and primary_caption.image_count is not None and primary_caption.image_count > 0:
            image_count = primary_caption.image_count
            # Populate all_image_ids from the relationship if loaded
            if hasattr(primary_caption, 'images') and primary_caption.images is not None:
                all_image_ids = [str(linked_img.image_id) for linked_img in primary_caption.images]
            else:
                # Fallback to single image if relationship not loaded
                all_image_ids = [str(img.image_id)]
        elif hasattr(primary_caption, 'images') and primary_caption.images is not None:
            image_count = len(primary_caption.images)
            all_image_ids = [str(linked_img.image_id) for linked_img in primary_caption.images]
        else:
            # Default to single image
            image_count = 1
            all_image_ids = [str(img.image_id)]
    else:
        # No captions, default to single image
        image_count = 1
        all_image_ids = [str(img.image_id)]
    
    img_dict = {
        "image_id": img.image_id,
        "file_key": img.file_key,
        "sha256": img.sha256,
        "thumbnail_key": getattr(img, 'thumbnail_key', None),
        "thumbnail_sha256": getattr(img, 'thumbnail_sha256', None),
        "thumbnail_url": thumbnail_url,
        "detail_key": getattr(img, 'detail_key', None),
        "detail_sha256": getattr(img, 'detail_sha256', None),
        "detail_url": detail_url,
        "source": img.source,
        "event_type": img.event_type,
        "epsg": img.epsg,
        "image_type": img.image_type,
        "image_url": image_url,
        "countries": countries_list,
        "captions": captions_list,
        "starred": starred,
        "captured_at": getattr(img, 'captured_at', None),
        
        # Multi-upload fields
        "image_count": image_count,
        "all_image_ids": all_image_ids,
        
        # Backward compatibility fields for legacy frontend
        "title": title,
        "prompt": prompt,
        "model": model,
        "schema_id": schema_id,
        "raw_json": raw_json,
        "generated": generated,
        "edited": edited,
        "accuracy": accuracy,
        "context": context,
        "usability": usability,
        "created_at": created_at,
        "updated_at": updated_at,
        
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
