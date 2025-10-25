# py_backend/app/routers/caption.py
from fastapi import APIRouter, HTTPException, Depends, Form, Request
from sqlalchemy.orm import Session
from typing import List
import logging

from .. import crud, database, schemas, storage
from ..services.vlm_service import vlm_manager
from ..services.schema_validator import schema_validator
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post(
    "/images/{image_id}/caption",
    response_model=schemas.CaptionOut,
)
async def create_caption(
    image_id: str,
    title: str = Form(...),
    prompt: str = Form(None),  # optional; will use active prompts if not provided
    model_name: str | None = Form(None),
    db: Session = Depends(get_db),
):
    logger.debug(f"Received request - image_id: {image_id}, title: {title}, prompt: {prompt}, model_name: {model_name}")
    
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "image not found")

    # Get the prompt (explicit by code/label, or active for image type)
    if prompt:
        logger.debug(f"Looking for prompt: '{prompt}' (type: {type(prompt)})")
        prompt_obj = crud.get_prompt(db, prompt) or crud.get_prompt_by_label(db, prompt)
    else:
        logger.debug(f"Looking for active prompt for image type: {img.image_type}")
        prompt_obj = crud.get_active_prompt_by_image_type(db, img.image_type)

    logger.debug(f"Prompt lookup result: {prompt_obj}")
    if not prompt_obj:
        raise HTTPException(400, f"No prompt found (requested: '{prompt}' or active for type '{img.image_type}')")

    prompt_text = prompt_obj.label
    metadata_instructions = prompt_obj.metadata_instructions or ""
    logger.debug(f"Using prompt text: '{prompt_text}'")
    logger.debug(f"Using metadata instructions: '{metadata_instructions[:100]}...'")

    # Load image bytes (S3 or local)
    try:
        logger.debug(f"About to call VLM service with model_name: {model_name}")
        if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
            response = storage.s3.get_object(
                Bucket=settings.S3_BUCKET,
                Key=img.file_key,
            )
            img_bytes = response["Body"].read()
        else:
            import os
            file_path = os.path.join(settings.STORAGE_DIR, img.file_key)
            with open(file_path, 'rb') as f:
                img_bytes = f.read()
    except Exception as e:
        logger.error(f"Error reading image file: {e}")
        # fallback: try presigned/public URL
        try:
            url = storage.get_object_url(img.file_key)
            if url.startswith('/') and settings.STORAGE_PROVIDER == "local":
                url = f"http://localhost:8000{url}"
            import requests
            resp = requests.get(url)
            resp.raise_for_status()
            img_bytes = resp.content
        except Exception as fallback_error:
            logger.error(f"Fallback also failed: {fallback_error}")
            raise HTTPException(500, f"Could not read image file: {e}")

    metadata = {}
    try:
        result = await vlm_manager.generate_caption(
            image_bytes=img_bytes,
            prompt=prompt_text,
            metadata_instructions=metadata_instructions,
            model_name=model_name,
            db_session=db,
        )
        
        logger.debug(f"VLM service result: {result}")
        logger.debug(f"Result model field: {result.get('model', 'NOT_FOUND')}")
        
        raw = result.get("raw_response", {})
        
        # Validate and clean the data using schema validation
        image_type = img.image_type
        logger.debug(f"Validating data for image type: {image_type}")
        logger.debug(f"Raw data structure: {list(raw.keys()) if isinstance(raw, dict) else 'Not a dict'}")
        
        cleaned_data, is_valid, validation_error = schema_validator.clean_and_validate_data(raw, image_type)
        
        if is_valid:
            logger.debug(f"✓ Schema validation passed for {image_type}")
            text = cleaned_data.get("analysis", "")
            metadata = cleaned_data.get("metadata", {})
        else:
            logger.debug(f"⚠ Schema validation failed for {image_type}: {validation_error}")
            text = result.get("caption", "This is a fallback caption due to schema validation error.")
            metadata = result.get("metadata", {})
            raw["validation_error"] = validation_error
            raw["validation_failed"] = True
        
        used_model = result.get("model", model_name) or "STUB_MODEL"
        if used_model == "random":
            logger.warning(f"VLM service returned 'random' as model name, using STUB_MODEL fallback")
            used_model = "STUB_MODEL"
        
        # Fallback info (if any)
        if result.get("fallback_used"):
            raw["fallback_info"] = {
                "original_model": result.get("original_model"),
                "fallback_model": used_model,
                "reason": result.get("fallback_reason"),
            }
        
    except Exception as e:
        logger.warning(f"VLM error, using fallback: {e}")
        text = "This is a fallback caption due to VLM service error."
        used_model = "STUB_MODEL"
        raw = {"error": str(e), "fallback": True}
        metadata = {}

    caption = crud.create_caption(
        db,
        image_id=image_id,
        title=title,
        prompt=prompt_obj.p_code,
        model_code=used_model,
        raw_json=raw,
        text=text,
        metadata=metadata,
    )
    
    db.refresh(caption)
    logger.debug(f"Caption created, caption object: {caption}")
    logger.debug(f"caption_id: {caption.caption_id}")
    return schemas.CaptionOut.from_orm(caption)

@router.get(
    "/captions/legacy",
    response_model=List[schemas.ImageOut],
)
def get_all_captions_legacy_format(
    request: Request,
    db: Session = Depends(get_db),
):
    """Get all images with captions in the old format for backward compatibility"""
    logger.debug(f"Fetching all captions in legacy format...")
    captions = crud.get_all_captions_with_images(db)
    logger.debug(f"Found {len(captions)} captions")
    
    result = []
    for caption in captions:
        db.refresh(caption)
        if caption.images:
            for image in caption.images:
                from .upload import convert_image_to_dict
                base_url = str(request.base_url).rstrip('/')
                url = f"{base_url}/api/images/{image.image_id}/file"
                logger.debug(f"Generated image URL: {url}")
                img_dict = convert_image_to_dict(image, url)

                # Overlay caption fields (legacy shape)
                img_dict.update({
                    "title": caption.title,
                    "prompt": caption.prompt,
                    "model": caption.model,
                    "schema_id": caption.schema_id,
                    "raw_json": caption.raw_json,
                    "generated": caption.generated,
                    "edited": caption.edited,
                    "accuracy": caption.accuracy,
                    "context": caption.context,
                    "usability": caption.usability,
                    "starred": caption.starred,
                    "created_at": caption.created_at,
                    "updated_at": caption.updated_at,
                })
                result.append(schemas.ImageOut(**img_dict))
    logger.debug(f"Returning {len(result)} legacy format results")
    return result

@router.get(
    "/captions",
    response_model=List[schemas.CaptionOut],
)
def get_all_captions_with_images(
    db: Session = Depends(get_db),
):
    """Get all captions"""
    logger.debug(f"Fetching all captions...")
    captions = crud.get_all_captions_with_images(db)
    logger.debug(f"Found {len(captions)} captions")
    
    result = []
    for caption in captions:
        logger.debug(f"Processing caption {caption.caption_id}, title: {caption.title}, generated: {caption.generated}, model: {caption.model}")
        db.refresh(caption)
        result.append(schemas.CaptionOut.from_orm(caption))
    logger.debug(f"Returning {len(result)} formatted results")
    return result

@router.get(
    "/images/{image_id}/captions",
    response_model=List[schemas.CaptionOut],
)
def get_captions_by_image(
    image_id: str,
    db: Session = Depends(get_db),
):
    """Get all captions for a specific image"""
    captions = crud.get_captions_by_image(db, image_id)
    result = []
    for caption in captions:
        db.refresh(caption)
        result.append(schemas.CaptionOut.from_orm(caption))
    return result

@router.get(
    "/captions/{caption_id}",
    response_model=schemas.CaptionOut,
)
def get_caption(
    caption_id: str,
    db: Session = Depends(get_db),
):
    caption = crud.get_caption(db, caption_id)
    if not caption:
        raise HTTPException(404, "caption not found")
    db.refresh(caption)
    return schemas.CaptionOut.from_orm(caption)

@router.put(
    "/captions/{caption_id}",
    response_model=schemas.CaptionOut,
)
def update_caption(
    caption_id: str,
    update: schemas.CaptionUpdate,
    db: Session = Depends(get_db),
):
    caption = crud.update_caption(db, caption_id, update)
    if not caption:
        raise HTTPException(404, "caption not found")
    db.refresh(caption)
    return schemas.CaptionOut.from_orm(caption)

@router.put(
    "/images/{image_id}/caption",
    response_model=schemas.CaptionOut,
)
def update_caption_by_image(
    image_id: str,
    update: schemas.CaptionUpdate,
    db: Session = Depends(get_db),
):
    """Update the first caption for an image (for backward compatibility)"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "image not found")
    if not img.captions:
        raise HTTPException(404, "no captions found for this image")

    caption = crud.update_caption(db, str(img.captions[0].caption_id), update)
    if not caption:
        raise HTTPException(404, "caption not found")
    db.refresh(caption)
    return schemas.CaptionOut.from_orm(caption)

@router.delete(
    "/captions/{caption_id}",
)
def delete_caption(
    caption_id: str,
    db: Session = Depends(get_db),
):
    """Delete caption data for a caption"""
    success = crud.delete_caption(db, caption_id)
    if not success:
        raise HTTPException(404, "caption not found")
    return {"message": "Caption deleted successfully"}
