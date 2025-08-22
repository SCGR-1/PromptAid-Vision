from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from typing import List
from .. import crud, database, schemas, storage
from ..services.vlm_service import vlm_manager
from ..services.schema_validator import schema_validator
from ..config import settings

from ..services.stub_vlm_service import StubVLMService
from ..services.gpt4v_service import GPT4VService
from ..services.gemini_service import GeminiService
from ..services.huggingface_service import ProvidersGenericVLMService

stub_service = StubVLMService()
vlm_manager.register_service(stub_service)

if settings.OPENAI_API_KEY:
    try:
        gpt4v_service = GPT4VService(settings.OPENAI_API_KEY)
        vlm_manager.register_service(gpt4v_service)
        print(f"✓ GPT-4 Vision service registered")
    except Exception as e:
        print(f"✗ GPT-4 Vision service failed: {e}")
else:
    print("○ GPT-4 Vision service not configured")

if settings.GOOGLE_API_KEY:
    try:
        gemini_service = GeminiService(settings.GOOGLE_API_KEY)
        vlm_manager.register_service(gemini_service)
        print(f"✓ Gemini service registered")
    except Exception as e:
        print(f"✗ Gemini service failed: {e}")
else:
    print("○ Gemini service not configured")

if settings.HF_API_KEY:
    try:
        # Dynamically register models from database
        from .. import crud
        from ..database import SessionLocal
        
        db = SessionLocal()
        try:
            models = crud.get_models(db)
            for model in models:
                if model.provider == "huggingface" and model.model_id:
                    try:
                        service = ProvidersGenericVLMService(
                            api_key=settings.HF_API_KEY,
                            model_id=model.model_id,
                            public_name=model.m_code
                        )
                        vlm_manager.register_service(service)
                        print(f"✓ Registered HF model: {model.m_code} -> {model.model_id}")
                    except Exception as e:
                        print(f"✗ Failed to register {model.m_code}: {e}")
            print(f"✓ Hugging Face services registered dynamically from database")
        finally:
            db.close()
    except Exception as e:
        print(f"✗ Hugging Face services failed: {e}")
        import traceback
        traceback.print_exc()
else:
    print("○ Hugging Face services not configured")

print(f"✓ Available models: {', '.join(vlm_manager.get_available_models())}")
print(f"✓ Total services: {len(vlm_manager.services)}")

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post(
    "/images/{image_id}/caption",
    response_model=schemas.ImageOut,
)
async def create_caption(
    image_id: str,
    title: str = Form(...),
    prompt: str = Form(...),
    model_name: str | None = Form(None),
    db: Session = Depends(get_db),
):
    print(f"DEBUG: Received request - image_id: {image_id}, title: {title}, prompt: {prompt}, model_name: {model_name}")
    
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "image not found")


    print(f"Looking for prompt: '{prompt}' (type: {type(prompt)})")

    prompt_obj = crud.get_prompt(db, prompt)
    
    if not prompt_obj:
        print(f"Prompt not found by code, trying to find by label...")
        prompt_obj = crud.get_prompt_by_label(db, prompt)
    
    print(f"Prompt lookup result: {prompt_obj}")
    if not prompt_obj:
        raise HTTPException(400, f"Prompt '{prompt}' not found")
    
    prompt_text = prompt_obj.label
    metadata_instructions = prompt_obj.metadata_instructions or ""
    print(f"Using prompt text: '{prompt_text}'")
    print(f"Using metadata instructions: '{metadata_instructions[:100]}...'")

    try:
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
        print(f"Error reading image file: {e}")
        try:
            url = storage.get_object_url(img.file_key)
            if url.startswith('/') and settings.STORAGE_PROVIDER == "local":
                url = f"http://localhost:8000{url}"
            import requests
            resp = requests.get(url)
            resp.raise_for_status()
            img_bytes = resp.content
        except Exception as fallback_error:
            print(f"Fallback also failed: {fallback_error}")
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
        
        # Get the raw response for validation
        raw = result.get("raw_response", {})
        
        # Validate and clean the data using schema validation
        image_type = img.image_type
        print(f"DEBUG: Validating data for image type: {image_type}")
        print(f"DEBUG: Raw data structure: {list(raw.keys()) if isinstance(raw, dict) else 'Not a dict'}")
        
        cleaned_data, is_valid, validation_error = schema_validator.clean_and_validate_data(raw, image_type)
        
        if is_valid:
            print(f"✓ Schema validation passed for {image_type}")
            text = cleaned_data.get("analysis", "")
            metadata = cleaned_data.get("metadata", {})
        else:
            print(f"⚠ Schema validation failed for {image_type}: {validation_error}")
            # Use fallback but log the validation error
            text = result.get("caption", "This is a fallback caption due to schema validation error.")
            metadata = result.get("metadata", {})
            raw["validation_error"] = validation_error
            raw["validation_failed"] = True
        
        # Use the actual model that was used, not the requested model_name
        used_model = result.get("model", model_name) or "STUB_MODEL"
        
        # Check if fallback was used
        fallback_used = result.get("fallback_used", False)
        original_model = result.get("original_model", None)
        fallback_reason = result.get("fallback_reason", None)
        
        if fallback_used:
            print(f"⚠ Model fallback occurred: {original_model} -> {used_model} (reason: {fallback_reason})")
            # Add fallback info to raw response for frontend
            raw["fallback_info"] = {
                "original_model": original_model,
                "fallback_model": used_model,
                "reason": fallback_reason
            }
        
    except Exception as e:
        print(f"VLM error, using fallback: {e}")
        text = "This is a fallback caption due to VLM service error."
        used_model = "STUB_MODEL"
        raw = {"error": str(e), "fallback": True}
        metadata = {}

    c = crud.create_caption(
        db,
        image_id=image_id,
        title=title,
        prompt=prompt_obj.p_code,
        model_code=used_model,
        raw_json=raw,
        text=text,
        metadata=metadata,
    )
    
    db.refresh(c)
    
    print(f"DEBUG: Caption created, image object: {c}")
    print(f"DEBUG: file_key: {c.file_key}")
    print(f"DEBUG: image_id: {c.image_id}")
    
    from .upload import convert_image_to_dict
    try:
        url = storage.get_object_url(c.file_key)
        print(f"DEBUG: Generated URL: {url}")
        if url.startswith('/') and settings.STORAGE_PROVIDER == "local":
            url = f"http://localhost:8000{url}"
            print(f"DEBUG: Local URL adjusted to: {url}")
    except Exception as e:
        print(f"DEBUG: URL generation failed: {e}")
        url = f"/api/images/{c.image_id}/file"
        print(f"DEBUG: Using fallback URL: {url}")
    
    img_dict = convert_image_to_dict(c, url)
    return schemas.ImageOut(**img_dict)

@router.get(
    "/images/{image_id}/caption",
    response_model=schemas.ImageOut,
)
def get_caption(
    image_id: str,
    db: Session = Depends(get_db),
):
    caption = crud.get_caption(db, image_id)
    if not caption or not caption.title:
        raise HTTPException(404, "caption not found")
    
    db.refresh(caption)
    
    from .upload import convert_image_to_dict
    try:
        url = storage.get_object_url(caption.file_key)
        if url.startswith('/') and settings.STORAGE_PROVIDER == "local":
            url = f"http://localhost:8000{url}"
    except Exception:
        url = f"/api/images/{caption.image_id}/file"
    
    img_dict = convert_image_to_dict(caption, url)
    return schemas.ImageOut(**img_dict)

@router.get(
    "/images/{image_id}/captions",
    response_model=List[schemas.ImageOut],
)
def get_captions_by_image(
    image_id: str,
    db: Session = Depends(get_db),
):
    """Get caption data for a specific image"""
    captions = crud.get_captions_by_image(db, image_id)
    
    from .upload import convert_image_to_dict
    result = []
    for caption in captions:
        db.refresh(caption)
        
        try:
            url = storage.get_object_url(caption.file_key)
        except Exception:
            url = f"/api/images/{caption.image_id}/file"
        
        img_dict = convert_image_to_dict(caption, url)
        result.append(schemas.ImageOut(**img_dict))
    
    return result

@router.get(
    "/captions",
    response_model=List[schemas.ImageOut],
)
def get_all_captions_with_images(
    db: Session = Depends(get_db),
):
    """Get all images that have caption data"""
    print(f"DEBUG: Fetching all captions with images...")
    captions = crud.get_all_captions_with_images(db)
    print(f"DEBUG: Found {len(captions)} images with caption data")
    
    from .upload import convert_image_to_dict
    result = []
    for caption in captions:
        print(f"DEBUG: Processing image {caption.image_id}, title: {caption.title}, generated: {caption.generated}, model: {caption.model}")
        
        db.refresh(caption)
        
        try:
            url = storage.get_object_url(caption.file_key)
        except Exception:
            url = f"/api/images/{caption.image_id}/file"
        
        img_dict = convert_image_to_dict(caption, url)
        result.append(schemas.ImageOut(**img_dict))
    
    print(f"DEBUG: Returning {len(result)} formatted results")
    return result

@router.put(
    "/images/{image_id}/caption",
    response_model=schemas.ImageOut,
)
def update_caption(
    image_id: str,
    update: schemas.CaptionUpdate,
    db: Session = Depends(get_db),
):
    caption = crud.update_caption(db, image_id, update)
    if not caption:
        raise HTTPException(404, "caption not found")
    
    db.refresh(caption)
    
    from .upload import convert_image_to_dict
    try:
        url = storage.get_object_url(caption.file_key)
    except Exception:
        url = f"/api/images/{caption.image_id}/file"
    
    img_dict = convert_image_to_dict(caption, url)
    return schemas.ImageOut(**img_dict)

@router.delete(
    "/images/{image_id}/caption",
)
def delete_caption(
    image_id: str,
    db: Session = Depends(get_db),
):
    """Delete caption data for an image"""
    success = crud.delete_caption(db, image_id)
    if not success:
        raise HTTPException(404, "caption not found")
    return {"message": "Caption deleted successfully"}
