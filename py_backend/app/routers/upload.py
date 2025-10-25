from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException, Response
from pydantic import BaseModel
import io
import logging
from sqlalchemy.orm import Session
from .. import crud, schemas, storage, database
from ..config import settings
from ..services.image_preprocessor import ImagePreprocessor
from ..services.thumbnail_service import ImageProcessingService
from typing import List, Optional
import boto3
import time
import base64
import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

class CopyImageRequest(BaseModel):
    source_image_id: str
    source: str
    event_type: str
    countries: str = ""
    epsg: str = ""
    image_type: str = "crisis_map"
    # Drone-specific fields (optional)
    center_lon: Optional[float] = None
    center_lat: Optional[float] = None
    amsl_m: Optional[float] = None
    agl_m: Optional[float] = None
    heading_deg: Optional[float] = None
    yaw_deg: Optional[float] = None
    pitch_deg: Optional[float] = None
    roll_deg: Optional[float] = None
    rtk_fix: Optional[bool] = None
    std_h_m: Optional[float] = None
    std_v_m: Optional[float] = None

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def convert_image_to_dict(img, image_url):
    """Helper function to convert SQLAlchemy image model to dict for Pydantic"""
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
    
    # Generate URLs for all image versions
    thumbnail_url = None
    detail_url = None
    
    if hasattr(img, 'thumbnail_key') and img.thumbnail_key:
        try:
            thumbnail_url = storage.get_object_url(img.thumbnail_key)
        except Exception as e:
            logger.warning(f"Error generating thumbnail URL for image {img.image_id}: {e}")
    
    if hasattr(img, 'detail_key') and img.detail_key:
        try:
            detail_url = storage.get_object_url(img.detail_key)
        except Exception as e:
            logger.warning(f"Error generating detail URL for image {img.image_id}: {e}")
    
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
        "starred": starred,  # Backward compatibility
        "captured_at": img.captured_at,
        
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
        "std_v_m": getattr(img, 'std_v_m', None)
    }
    
    return img_dict


@router.get("/", response_model=List[schemas.ImageOut])
def list_images(db: Session = Depends(get_db)):
    """Get all images with their caption data"""
    images = crud.get_images(db)
    result = []
    for img in images:
        img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file")
        result.append(schemas.ImageOut(**img_dict))
    
    return result

@router.get("/grouped", response_model=List[schemas.ImageOut])
def list_images_grouped(
    page: int = 1, 
    limit: int = 10, 
    search: str = None,
    source: str = None,
    event_type: str = None,
    region: str = None,
    country: str = None,
    image_type: str = None,
    upload_type: str = None,
    starred_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get images grouped by shared captions for multi-upload items with pagination and filtering"""
    
    # Validate pagination parameters
    if page < 1:
        page = 1
    if limit < 1 or limit > 100:
        limit = 10
    
    # Get all captions with their associated images
    captions = crud.get_all_captions_with_images(db)
    result = []
    
    for caption in captions:
        if not caption.images:
            continue

        effective_image_count = caption.image_count if caption.image_count is not None and caption.image_count > 0 else len(caption.images)
        
        # Apply filters
        if search:
            search_lower = search.lower()
            if not (caption.title and search_lower in caption.title.lower()) and \
               not (caption.generated and search_lower in caption.generated.lower()):
                continue
        
        if starred_only and not caption.starred:
            continue
            
        if effective_image_count > 1:
            first_img = caption.images[0]
            if source:
                if not any(source in img.source for img in caption.images if img.source):
                    continue
            if event_type:
                if not any(event_type in img.event_type for img in caption.images if img.event_type):
                    continue
            if image_type:
                if not any(img.image_type == image_type for img in caption.images):
                    continue
            if upload_type:
                if upload_type == 'single' and effective_image_count > 1:
                    continue
                if upload_type == 'multiple' and effective_image_count <= 1:
                    continue
            if region or country:
                has_matching_country = False
                for img in caption.images:
                    for img_country in img.countries:
                        if region and img_country.r_code == region:
                            has_matching_country = True
                            break
                        if country and img_country.c_code == country:
                            has_matching_country = True
                            break
                    if has_matching_country:
                        break
                if not has_matching_country:
                    continue
            # Combine metadata from all images
            combined_source = set()
            combined_event_type = set()
            combined_epsg = set()
            
            for img in caption.images:
                if img.source:
                    combined_source.add(img.source)
                if img.event_type:
                    combined_event_type.add(img.event_type)
                if img.epsg:
                    combined_epsg.add(img.epsg)
            
            # Create a combined image dict using the first image as a template
            img_dict = convert_image_to_dict(first_img, f"/api/images/{first_img.image_id}/file")
            
            # Override with combined metadata
            img_dict["source"] = ", ".join(sorted(list(combined_source))) if combined_source else "OTHER"
            img_dict["event_type"] = ", ".join(sorted(list(combined_event_type))) if combined_event_type else "OTHER"
            img_dict["epsg"] = ", ".join(sorted(list(combined_epsg))) if combined_epsg else "OTHER"
            
            # Update countries to include all unique countries
            all_countries = []
            for img in caption.images:
                for country_obj in img.countries:
                    if not any(c["c_code"] == country_obj.c_code for c in all_countries):
                        all_countries.append({"c_code": country_obj.c_code, "label": country_obj.label, "r_code": country_obj.r_code})
            img_dict["countries"] = all_countries
            
            # Add all image IDs for reference
            img_dict["all_image_ids"] = [str(img.image_id) for img in caption.images]
            img_dict["image_count"] = effective_image_count
            
            # Set caption-level fields
            img_dict["title"] = caption.title
            img_dict["prompt"] = caption.prompt
            img_dict["model"] = caption.model
            img_dict["schema_id"] = caption.schema_id
            img_dict["raw_json"] = caption.raw_json
            img_dict["generated"] = caption.generated
            img_dict["edited"] = caption.edited
            img_dict["accuracy"] = caption.accuracy
            img_dict["context"] = caption.context
            img_dict["usability"] = caption.usability
            img_dict["starred"] = caption.starred
            img_dict["created_at"] = caption.created_at
            img_dict["updated_at"] = caption.updated_at

            result.append(schemas.ImageOut(**img_dict))
        else:
            # For single images, apply filters
            img = caption.images[0]
            
            if source and img.source != source:
                continue
            if event_type and img.event_type != event_type:
                continue
            if image_type and img.image_type != image_type:
                continue
            if upload_type == 'multiple':
                continue
            
            # Apply region/country filter
            if region or country:
                has_matching_country = False
                for img_country in img.countries:
                    if region and img_country.r_code == region:
                        has_matching_country = True
                        break
                    if country and img_country.c_code == country:
                        has_matching_country = True
                        break
                if not has_matching_country:
                    continue
            
            img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file")
            img_dict["all_image_ids"] = [str(img.image_id)]
            img_dict["image_count"] = 1
            
            # Set caption-level fields
            img_dict["title"] = caption.title
            img_dict["prompt"] = caption.prompt
            img_dict["model"] = caption.model
            img_dict["schema_id"] = caption.schema_id
            img_dict["raw_json"] = caption.raw_json
            img_dict["generated"] = caption.generated
            img_dict["edited"] = caption.edited
            img_dict["accuracy"] = caption.accuracy
            img_dict["context"] = caption.context
            img_dict["usability"] = caption.usability
            img_dict["starred"] = caption.starred
            img_dict["created_at"] = caption.created_at
            img_dict["updated_at"] = caption.updated_at

            result.append(schemas.ImageOut(**img_dict))
    
    # Apply pagination
    total_count = len(result)
    start_index = (page - 1) * limit
    end_index = start_index + limit
    paginated_result = result[start_index:end_index]
    
    return paginated_result

@router.get("/grouped/count")
def get_images_grouped_count(
    search: str = None,
    source: str = None,
    event_type: str = None,
    region: str = None,
    country: str = None,
    image_type: str = None,
    upload_type: str = None,
    starred_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get total count of images for pagination"""
    
    # Get all captions with their associated images
    captions = crud.get_all_captions_with_images(db)
    count = 0
    
    for caption in captions:
        if not caption.images:
            continue
            
        # Determine the effective image count for this caption
        effective_image_count = caption.image_count if caption.image_count is not None and caption.image_count > 0 else len(caption.images)
        
        # Apply filters (same logic as above)
        if search:
            search_lower = search.lower()
            if not (caption.title and search_lower in caption.title.lower()) and \
               not (caption.generated and search_lower in caption.generated.lower()):
                continue
        
        if starred_only and not caption.starred:
            continue
            
        if effective_image_count > 1:
            # Multi-upload item
            first_img = caption.images[0]
            
            # Apply filters
            if source:
                if not any(source in img.source for img in caption.images if img.source):
                    continue
            
            if event_type:
                if not any(event_type in img.event_type for img in caption.images if img.event_type):
                    continue
            
            if image_type:
                if not any(img.image_type == image_type for img in caption.images):
                    continue
            
            if upload_type:
                if upload_type == 'single' and effective_image_count > 1:
                    continue
                if upload_type == 'multiple' and effective_image_count <= 1:
                    continue
            
            if region or country:
                has_matching_country = False
                for img in caption.images:
                    for img_country in img.countries:
                        if region and img_country.r_code == region:
                            has_matching_country = True
                            break
                        if country and img_country.c_code == country:
                            has_matching_country = True
                            break
                    if has_matching_country:
                        break
                if not has_matching_country:
                    continue
            
            count += 1
        else:
            # Single image
            img = caption.images[0]
            
            if source and img.source != source:
                continue
            if event_type and img.event_type != event_type:
                continue
            if image_type and img.image_type != image_type:
                continue
            if upload_type == 'multiple':
                continue
            
            if region or country:
                has_matching_country = False
                for img_country in img.countries:
                    if region and img_country.r_code == region:
                        has_matching_country = True
                        break
                    if country and img_country.c_code == country:
                        has_matching_country = True
                        break
                if not has_matching_country:
                    continue
            
            count += 1
    
    return {"total_count": count}

@router.get("/{image_id}", response_model=schemas.ImageOut)
def get_image(image_id: str, db: Session = Depends(get_db)):
    """Get a single image by ID"""
    # Validate image_id before querying database
    if not image_id or image_id in ['undefined', 'null', '']:
        raise HTTPException(400, "Invalid image ID")
    
    # Validate UUID format
    import re
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    if not uuid_pattern.match(image_id):
        raise HTTPException(400, "Invalid image ID format")
    
    img = crud.get_image(db, image_id) # This loads captions
    if not img:
        raise HTTPException(404, "Image not found")
    
    img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file")

    # Enhance img_dict with multi-upload specific fields if applicable
    if img.captions:
        # Assuming an image is primarily associated with one "grouping" caption for multi-uploads
        # We take the first caption and check its linked images
        main_caption = img.captions[0] 
        
        # Refresh the caption to ensure its images relationship is loaded if not already
        db.refresh(main_caption) 
        
        if main_caption.images:
            all_linked_image_ids = [str(linked_img.image_id) for linked_img in main_caption.images]
            effective_image_count = main_caption.image_count if main_caption.image_count is not None and main_caption.image_count > 0 else len(main_caption.images)
            
            if effective_image_count > 1:
                img_dict["all_image_ids"] = all_linked_image_ids
                img_dict["image_count"] = effective_image_count
            else:
                # Even for single images, explicitly set image_count to 1
                img_dict["image_count"] = 1
                img_dict["all_image_ids"] = [str(img.image_id)] # Ensure it's an array for consistency
        else:
            # If caption has no linked images (shouldn't happen for valid data, but for robustness)
            img_dict["image_count"] = 1
            img_dict["all_image_ids"] = [str(img.image_id)]
    else:
        # If image has no captions, it's a single image by default
        img_dict["image_count"] = 1
        img_dict["all_image_ids"] = [str(img.image_id)]

    return schemas.ImageOut(**img_dict)


@router.post("/", response_model=schemas.ImageOut)
async def upload_image(
    source: Optional[str] = Form(default=None),
    event_type: str    = Form(default="OTHER"),
    countries: str     = Form(default=""),
    epsg: str          = Form(default=""),
    image_type: str    = Form(default="crisis_map"),
    file: UploadFile   = Form(...),
    title: str = Form(default=""),
    model_name: Optional[str] = Form(default=None),
    # Drone-specific fields (optional)
    center_lon: Optional[float]  = Form(default=None),
    center_lat: Optional[float]  = Form(default=None),
    amsl_m: Optional[float]      = Form(default=None),
    agl_m: Optional[float]       = Form(default=None),
    heading_deg: Optional[float] = Form(default=None),
    yaw_deg: Optional[float]     = Form(default=None),
    pitch_deg: Optional[float]   = Form(default=None),
    roll_deg: Optional[float]    = Form(default=None),
    rtk_fix: Optional[bool]      = Form(default=None),
    std_h_m: Optional[float]     = Form(default=None),
    std_v_m: Optional[float]     = Form(default=None),
    db: Session        = Depends(get_db)
):
    countries_list = [c.strip() for c in countries.split(',') if c.strip()] if countries else []
    
    if image_type == "drone_image":
        if not event_type or event_type.strip() == "":
            event_type = "OTHER"
        if not epsg or epsg.strip() == "":
            epsg = "OTHER"
    else:
        if not source or source.strip() == "":
            source = "OTHER"
        if not event_type or event_type.strip() == "":
            event_type = "OTHER"
        if not epsg or epsg.strip() == "":
            epsg = "OTHER"
    
    if not image_type or image_type.strip() == "":
        image_type = "crisis_map"
    
    if image_type != "drone_image":
        center_lon = None
        center_lat = None
        amsl_m = None
        agl_m = None
        heading_deg = None
        yaw_deg = None
        pitch_deg = None
        roll_deg = None
        rtk_fix = None
        std_h_m = None
        std_v_m = None
    
    content = await file.read()
    
    # Preprocess image if needed
    try:
        processed_content, processed_filename, mime_type = ImagePreprocessor.preprocess_image(
            content, 
            file.filename,
            target_format='PNG',  # Default to PNG for better quality
            quality=95
        )
        
        # Log preprocessing info
        preprocessing_info = None
        if processed_filename != file.filename:
            logger.info(f"Image preprocessed: {file.filename} -> {processed_filename} ({mime_type})")
            preprocessing_info = {
                "original_filename": file.filename,
                "processed_filename": processed_filename,
                "original_mime_type": ImagePreprocessor.detect_mime_type(content, file.filename),
                "processed_mime_type": mime_type,
                "was_preprocessed": True
            }
        else:
            preprocessing_info = {
                "original_filename": file.filename,
                "processed_filename": file.filename,
                "original_mime_type": mime_type,
                "processed_mime_type": mime_type,
                "was_preprocessed": False
            }
        
    except Exception as e:
        logger.error(f"Image preprocessing failed: {str(e)}")
        # Fall back to original content if preprocessing fails
        processed_content = content
        processed_filename = file.filename
        mime_type = 'image/png'  # Default fallback
        preprocessing_info = {
            "original_filename": file.filename,
            "processed_filename": file.filename,
            "original_mime_type": "unknown",
            "processed_mime_type": mime_type,
            "was_preprocessed": False,
            "error": str(e)
        }
    
    sha = crud.hash_bytes(processed_content)

    key = storage.upload_fileobj(io.BytesIO(processed_content), processed_filename)

    # Generate and upload all image resolutions
    thumbnail_key = None
    thumbnail_sha256 = None
    detail_key = None
    detail_sha256 = None
    
    try:
        # Process both thumbnail and detail versions
        thumbnail_result, detail_result = ImageProcessingService.process_all_resolutions(
            processed_content, 
            processed_filename
        )
        
        if thumbnail_result:
            thumbnail_key, thumbnail_sha256 = thumbnail_result
            logger.info(f"Thumbnail generated and uploaded: key={thumbnail_key}, sha256={thumbnail_sha256}")
        
        if detail_result:
            detail_key, detail_sha256 = detail_result
            logger.info(f"Detail version generated and uploaded: key={detail_key}, sha256={detail_sha256}")
            
    except Exception as e:
        logger.error(f"Image resolution processing failed: {str(e)}")
        # Continue without processed versions if generation fails

    try:
        img = crud.create_image(
            db, source, event_type, key, sha, countries_list, epsg, image_type,
            center_lon, center_lat, amsl_m, agl_m, heading_deg, yaw_deg, pitch_deg, roll_deg,
            rtk_fix, std_h_m, std_v_m, 
            thumbnail_key=thumbnail_key, thumbnail_sha256=thumbnail_sha256,
            detail_key=detail_key, detail_sha256=detail_sha256
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to save image to database: {str(e)}")

    try:
        url = storage.get_object_url(key)
    except Exception as e:
        url = f"/api/images/{img.image_id}/file"

    # Create caption using VLM
    prompt_obj = crud.get_active_prompt_by_image_type(db, image_type)
    
    if not prompt_obj:
        raise HTTPException(400, f"No active prompt found for image type '{image_type}'")
    
    prompt_text = prompt_obj.label
    metadata_instructions = prompt_obj.metadata_instructions or ""
    
    try:
        from ..services.vlm_service import vlm_manager
        result = await vlm_manager.generate_caption(
            image_bytes=processed_content,
            prompt=prompt_text,
            metadata_instructions=metadata_instructions,
            model_name=model_name,
            db_session=db,
        )
        
        raw = result.get("raw_response", {})
        text = result.get("caption", "")
        metadata = result.get("metadata", {})
        
        actual_model = result.get("model", model_name)
        
        # Include fallback information in raw_json if fallback occurred
        if result.get("fallback_used"):
            raw.update({
                "fallback_used": result.get("fallback_used"),
                "original_model": result.get("original_model"),
                "fallback_reason": result.get("fallback_reason")
            })
        
        final_model_name = actual_model if actual_model != "random" else "STUB_MODEL"
        
        caption = crud.create_caption(
            db,
            image_id=img.image_id,
            title=title,
            prompt=prompt_obj.p_code,
            model_code=final_model_name,
            raw_json=raw,
            text=text,
            metadata=metadata,
            image_count=1
        )
        
    except Exception as e:
        logger.error(f"VLM caption generation failed: {str(e)}")
        # Continue without caption if VLM fails
    
    img_dict = convert_image_to_dict(img, url)
    # Add preprocessing info to the response
    img_dict['preprocessing_info'] = preprocessing_info
    result = schemas.ImageOut(**img_dict)
    return result

@router.post("/multi", response_model=schemas.ImageOut)
async def upload_multiple_images(
    files: List[UploadFile] = Form(...),
    source: Optional[str] = Form(default=None),
    event_type: str = Form(default="OTHER"),
    countries: str = Form(default=""),
    epsg: str = Form(default=""),
    image_type: str = Form(default="crisis_map"),
    title: str = Form(...),
    model_name: Optional[str] = Form(default=None),
    # Drone-specific fields (optional)
    center_lon: Optional[float] = Form(default=None),
    center_lat: Optional[float] = Form(default=None),
    amsl_m: Optional[float] = Form(default=None),
    agl_m: Optional[float] = Form(default=None),
    heading_deg: Optional[float] = Form(default=None),
    yaw_deg: Optional[float] = Form(default=None),
    pitch_deg: Optional[float] = Form(default=None),
    roll_deg: Optional[float] = Form(default=None),
    rtk_fix: Optional[bool] = Form(default=None),
    std_h_m: Optional[float] = Form(default=None),
    std_v_m: Optional[float] = Form(default=None),
    db: Session = Depends(get_db)
):
    """Upload multiple images and create a single caption for all of them"""
    
    if len(files) > 5:
        raise HTTPException(400, "Maximum 5 images allowed")
    
    if len(files) < 1:
        raise HTTPException(400, "At least one image required")
    
    countries_list = [c.strip() for c in countries.split(',') if c.strip()] if countries else []
    
    if image_type == "drone_image":
        if not event_type or event_type.strip() == "":
            event_type = "OTHER"
        if not epsg or epsg.strip() == "":
            epsg = "OTHER"
    else:
        if not source or source.strip() == "":
            source = "OTHER"
        if not event_type or event_type.strip() == "":
            event_type = "OTHER"
        if not epsg or epsg.strip() == "":
            epsg = "OTHER"
    
    if not image_type or image_type.strip() == "":
        image_type = "crisis_map"
    
    if image_type != "drone_image":
        center_lon = None
        center_lat = None
        amsl_m = None
        agl_m = None
        heading_deg = None
        yaw_deg = None
        pitch_deg = None
        roll_deg = None
        rtk_fix = None
        std_h_m = None
        std_v_m = None
    
    uploaded_images = []
    image_bytes_list = []
    
    # Process each file
    for file in files:
        content = await file.read()
        
        # Preprocess image if needed
        try:
            processed_content, processed_filename, mime_type = ImagePreprocessor.preprocess_image(
                content, 
                file.filename,
                target_format='PNG',
                quality=95
            )
        except Exception as e:
            logger.debug(f"Image preprocessing failed: {str(e)}")
            processed_content = content
            processed_filename = file.filename
            mime_type = 'image/png'
        
        sha = crud.hash_bytes(processed_content)
        key = storage.upload_fileobj(io.BytesIO(processed_content), processed_filename)
        
        # Create image record
        img = crud.create_image(
            db, source, event_type, key, sha, countries_list, epsg, image_type,
            center_lon, center_lat, amsl_m, agl_m, heading_deg, yaw_deg, pitch_deg, roll_deg,
            rtk_fix, std_h_m, std_v_m
        )
        
        uploaded_images.append(img)
        image_bytes_list.append(processed_content)
    
    # Get the first image for URL generation (they all share the same metadata)
    first_img = uploaded_images[0]
    
    try:
        url = storage.get_object_url(first_img.file_key)
    except Exception as e:
        url = f"/api/images/{first_img.image_id}/file"
    
    # Create caption for all images
    # Use the model_name parameter from the request, or let VLM manager choose the best available model
    prompt_obj = crud.get_active_prompt_by_image_type(db, image_type)
    
    if not prompt_obj:
        raise HTTPException(400, f"No active prompt found for image type '{image_type}'")
    
    prompt_text = prompt_obj.label
    metadata_instructions = prompt_obj.metadata_instructions or ""
    
    # Add system instruction for multiple images
    multi_image_instruction = f"\n\nIMPORTANT: You are analyzing {len(image_bytes_list)} images. Please provide a combined analysis that covers all images together. In your metadata section, provide separate metadata for each image:\n- 'title': ONE shared title for all images\n- 'metadata_images': an object containing individual metadata for each image:\n  - 'image1': {{ 'source': 'data source', 'type': 'event type', 'countries': ['country codes'], 'epsg': 'spatial reference' }}\n  - 'image2': {{ 'source': 'data source', 'type': 'event type', 'countries': ['country codes'], 'epsg': 'spatial reference' }}\n  - etc. for each image\n\nEach image should have its own source, type, countries, and epsg values based on what that specific image shows."
    metadata_instructions += multi_image_instruction
    
    try:
        from ..services.vlm_service import vlm_manager
        result = await vlm_manager.generate_multi_image_caption(
            image_bytes_list=image_bytes_list,
            prompt=prompt_text,
            metadata_instructions=metadata_instructions,
            model_name=model_name,
            db_session=db,
        )
        
        raw = result.get("raw_response", {})
        text = result.get("caption", "")
        metadata = result.get("metadata", {})
        
        # Use the actual model that was used by the VLM service
        actual_model = result.get("model", model_name)
        
        # Include fallback information in raw_json if fallback occurred
        if result.get("fallback_used"):
            raw.update({
                "fallback_used": result.get("fallback_used"),
                "original_model": result.get("original_model"),
                "fallback_reason": result.get("fallback_reason")
            })
        
        # Update individual image metadata if VLM provided it
        metadata_images = metadata.get("metadata_images", {})
        if metadata_images and isinstance(metadata_images, dict):
            for i, img in enumerate(uploaded_images):
                image_key = f"image{i+1}"
                if image_key in metadata_images:
                    img_metadata = metadata_images[image_key]
                    if isinstance(img_metadata, dict):
                        # Update image with individual metadata
                        img.source = img_metadata.get("source", img.source)
                        img.event_type = img_metadata.get("type", img.event_type)
                        img.epsg = img_metadata.get("epsg", img.epsg)
                        img.countries = img_metadata.get("countries", img.countries)
        
        # Ensure we never use 'random' as the model name in the database
        final_model_name = actual_model if actual_model != "random" else "STUB_MODEL"
        
        # Create caption linked to the first image
        caption = crud.create_caption(
            db,
            image_id=first_img.image_id,
            title=title,
            prompt=prompt_obj.p_code,
            model_code=final_model_name,
            raw_json=raw,
            text=text,
            metadata=metadata,
            image_count=len(image_bytes_list)
        )
        
        # Link caption to all images
        for img in uploaded_images[1:]:
            img.captions.append(caption)
        
        db.commit()
        
    except Exception as e:
        logger.debug(f"VLM error: {e}")
        # Create fallback caption
        fallback_text = f"Analysis of {len(image_bytes_list)} images"
        caption = crud.create_caption(
            db,
            image_id=first_img.image_id,
            title=title,
            prompt=prompt_obj.p_code,
            model_code="FALLBACK",
            raw_json={"error": str(e), "fallback": True},
            text=fallback_text,
            metadata={},
            image_count=len(image_bytes_list)
        )
        
        # Link caption to all images
        for img in uploaded_images[1:]:
            img.captions.append(caption)
        
        db.commit()
    
    img_dict = convert_image_to_dict(first_img, url)
    
    # Add all image IDs to the response for multi-image uploads
    if len(uploaded_images) > 1:
        img_dict["all_image_ids"] = [str(img.image_id) for img in uploaded_images]
        img_dict["image_count"] = len(uploaded_images)
    
    result = schemas.ImageOut(**img_dict)
    return result

@router.post("/copy", response_model=schemas.ImageOut)
async def copy_image_for_contribution(
    request: CopyImageRequest,
    db: Session = Depends(get_db)
):
    """Copy an existing image for contribution purposes, creating a new image_id"""
    source_img = crud.get_image(db, request.source_image_id)
    if not source_img:
        raise HTTPException(404, "Source image not found")
    
    try:
        if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
            response = storage.s3.get_object(
                Bucket=settings.S3_BUCKET,
                Key=source_img.file_key,
            )
            image_content = response["Body"].read()
        else:
            import os
            file_path = os.path.join(settings.STORAGE_DIR, source_img.file_key)
            with open(file_path, 'rb') as f:
                image_content = f.read()
        
        new_filename = f"contribution_{request.source_image_id}_{int(time.time())}.jpg"
        new_key = storage.upload_fileobj(io.BytesIO(image_content), new_filename)
        
        countries_list = [c.strip() for c in request.countries.split(',') if c.strip()] if request.countries else []
        
        new_img = crud.create_image(
            db, 
            request.source, 
            request.event_type, 
            new_key, 
            source_img.sha256,
            countries_list, 
            request.epsg, 
            request.image_type,
            request.center_lon, request.center_lat, request.amsl_m, request.agl_m,
            request.heading_deg, request.yaw_deg, request.pitch_deg, request.roll_deg,
            request.rtk_fix, request.std_h_m, request.std_v_m
        )
        
        try:
            url = storage.get_object_url(new_key)
        except Exception as e:
            url = f"/api/images/{new_img.image_id}/file"
        
        img_dict = convert_image_to_dict(new_img, url)
        result = schemas.ImageOut(**img_dict)
        return result
        
    except Exception as e:
        raise HTTPException(500, f"Failed to copy image: {str(e)}")

@router.get("/{image_id}/file")
async def get_image_file(image_id: str, db: Session = Depends(get_db)):
    """Serve the actual image file"""
    logger.debug(f"Serving image file for image_id: {image_id}")
    
    img = crud.get_image(db, image_id)
    if not img:
        logger.warning(f"Image not found: {image_id}")
        raise HTTPException(404, "Image not found")
    
    logger.debug(f"Found image: {img.image_id}, file_key: {img.file_key}")
    
    try:
        if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
            logger.debug(f"Using S3 storage - serving file content directly")
            try:
                response = storage.s3.get_object(Bucket=settings.S3_BUCKET, Key=img.file_key)
                content = response['Body'].read()
                logger.debug(f"Read {len(content)} bytes from S3")
            except Exception as e:
                logger.error(f"Failed to get S3 object: {e}")
                raise HTTPException(500, f"Failed to retrieve image from storage: {e}")
        else:
            logger.debug(f"Using local storage")
            import os
            file_path = os.path.join(settings.STORAGE_DIR, img.file_key)
            logger.debug(f"Reading from: {file_path}")
            logger.debug(f"File exists: {os.path.exists(file_path)}")
            
            if not os.path.exists(file_path):
                logger.error(f"File not found at: {file_path}")
                raise FileNotFoundError(f"Image file not found: {file_path}")
            
            with open(file_path, 'rb') as f:
                content = f.read()
            
            logger.debug(f"Read {len(content)} bytes from file")
        
        import mimetypes
        content_type, _ = mimetypes.guess_type(img.file_key)
        if not content_type:
            content_type = 'application/octet-stream'
        
        logger.debug(f"Serving image with content-type: {content_type}, size: {len(content)} bytes")
        return Response(content=content, media_type=content_type)
    except Exception as e:
        logger.error(f"Error serving image: {e}")
        import traceback
        logger.debug(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(500, f"Failed to serve image file: {e}")

@router.put("/{image_id}")
def update_image_metadata(
    image_id: str,
    metadata: schemas.ImageMetadataUpdate,
    db: Session = Depends(get_db)
):
    """Update image metadata (source, type, epsg, image_type, countries)"""
    logger.debug(f"DEBUG: Updating metadata for image {image_id}")
    logger.debug(f"DEBUG: Metadata received: {metadata}")
    
    img = crud.get_image(db, image_id)
    if not img:
        logger.debug(f"DEBUG: Image {image_id} not found in database")
        raise HTTPException(404, "Image not found")
    
    logger.debug(f"DEBUG: Found image {image_id} in database")
    
    try:
        if metadata.source is not None:
            img.source = metadata.source
        if metadata.event_type is not None:
            img.event_type = metadata.event_type
        if metadata.epsg is not None:
            img.epsg = metadata.epsg
        if metadata.image_type is not None:
            img.image_type = metadata.image_type
        # Handle starred field - update the first caption's starred status
        if metadata.starred is not None:
            if img.captions:
                # Update the first caption's starred status
                img.captions[0].starred = metadata.starred
            else:
                # If no captions exist, create a minimal caption with starred status
                from app import models
                caption = models.Captions(
                    title="",
                    starred=metadata.starred,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(caption)
                img.captions.append(caption)
        
        # Update drone-specific fields
        if metadata.center_lon is not None:
            img.center_lon = metadata.center_lon
        if metadata.center_lat is not None:
            img.center_lat = metadata.center_lat
        if metadata.amsl_m is not None:
            img.amsl_m = metadata.amsl_m
        if metadata.agl_m is not None:
            img.agl_m = metadata.agl_m
        if metadata.heading_deg is not None:
            img.heading_deg = metadata.heading_deg
        if metadata.yaw_deg is not None:
            img.yaw_deg = metadata.yaw_deg
        if metadata.pitch_deg is not None:
            img.pitch_deg = metadata.pitch_deg
        if metadata.roll_deg is not None:
            img.roll_deg = metadata.roll_deg
        if metadata.rtk_fix is not None:
            img.rtk_fix = metadata.rtk_fix
        if metadata.std_h_m is not None:
            img.std_h_m = metadata.std_h_m
        if metadata.std_v_m is not None:
            img.std_v_m = metadata.std_v_m
        
        if metadata.countries is not None:
            logger.debug(f"DEBUG: Updating countries to: {metadata.countries}")
            img.countries.clear()
            for country_code in metadata.countries:
                country = crud.get_country(db, country_code)
                if country:
                    img.countries.append(country)
                    logger.debug(f"DEBUG: Added country: {country_code}")
        
        db.commit()
        db.refresh(img)
        logger.debug(f"DEBUG: Metadata update successful for image {image_id}")
        
        try:
            url = storage.get_object_url(img.file_key)
        except Exception:
            url = f"/api/images/{img.image_id}/file"
        
        img_dict = convert_image_to_dict(img, url)
        return schemas.ImageOut(**img_dict)
        
    except Exception as e:
        db.rollback()
        logger.debug(f"DEBUG: Metadata update failed for image {image_id}: {str(e)}")
        raise HTTPException(500, f"Failed to update image metadata: {str(e)}")

@router.delete("/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db), content_management: bool = False):
    """Delete an image and its associated caption data
    
    Args:
        image_id: The ID of the image to delete
        content_management: If True, this is a content management delete (from map details)
                          If False, this is a user dissatisfaction delete (from upload flow)
    """
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    # Only increment delete count if this is NOT a content management delete
    # Content management deletes (from map details) should not count against model performance
    if not content_management and img.captions:
        # Get model from the first caption
        model_name = img.captions[0].model
        if model_name:
            from .. import crud as crud_module
            model = crud_module.get_model(db, model_name)
            if model:
                model.delete_count += 1
                db.commit()
    
    db.delete(img)
    db.commit()
    
    return {"message": "Image deleted successfully"}

@router.post("/preprocess")
async def preprocess_image_only(
    file: UploadFile = Form(...),
    preprocess_only: bool = Form(False)
):
    """Preprocess image without storing it - returns processed file data"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Preprocess the image
        processed_content, processed_filename, processed_mime_type = ImagePreprocessor.preprocess_image(
            file_content, 
            file.filename or "unknown",
            target_format='PNG',
            quality=95
        )
        
        # Check if preprocessing actually occurred
        was_preprocessed = (
            processed_filename != (file.filename or "unknown") or
            processed_mime_type != file.content_type
        )
        
        # Encode processed content as base64 for JSON response
        processed_content_b64 = base64.b64encode(processed_content).decode('utf-8')
        
        # Create preprocessing info
        preprocessing_info = {
            "original_filename": file.filename or "unknown",
            "processed_filename": processed_filename,
            "original_mime_type": file.content_type or "application/octet-stream",
            "processed_mime_type": processed_mime_type,
            "was_preprocessed": was_preprocessed
        }
        
        # Return processed file data
        return {
            "processed_content": processed_content_b64,
            "processed_filename": processed_filename,
            "processed_mime_type": processed_mime_type,
            "preprocessing_info": preprocessing_info,
            "was_preprocessed": was_preprocessed
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Preprocessing failed: {str(e)}"
        )
