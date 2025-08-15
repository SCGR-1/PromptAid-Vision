from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from typing import List
from .. import crud, database, schemas, storage
from ..services.vlm_service import vlm_manager
from ..config import settings

from ..services.stub_vlm_service import StubVLMService
from ..services.gpt4v_service import GPT4VService
from ..services.gemini_service import GeminiService
from ..services.huggingface_service import LLaVAService, BLIP2Service, InstructBLIPService

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
        llava_service = LLaVAService(settings.HF_API_KEY)
        vlm_manager.register_service(llava_service)
        
        blip2_service = BLIP2Service(settings.HF_API_KEY)
        vlm_manager.register_service(blip2_service)
        
        instructblip_service = InstructBLIPService(settings.HF_API_KEY)
        vlm_manager.register_service(instructblip_service)
        
        print(f"✓ Hugging Face services registered (LLaVA, BLIP2, InstructBLIP)")
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
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "image not found")

    try:
        # Try to get image bytes using storage functions
        if hasattr(storage, 's3') and storage.settings.STORAGE_PROVIDER != "local":
            # S3/MinIO path
            response = storage.s3.get_object(
                Bucket=storage.settings.S3_BUCKET,
                Key=img.file_key,
            )
            img_bytes = response["Body"].read()
        else:
            # Local storage path - read file directly
            import os
            file_path = os.path.join(storage.settings.STORAGE_DIR, img.file_key)
            with open(file_path, 'rb') as f:
                img_bytes = f.read()
    except Exception as e:
        print(f"Error reading image file: {e}")
        # Fallback: try to get via URL
        try:
            url = storage.generate_presigned_url(img.file_key)
            if url.startswith('/'):
                # Local storage - construct full URL
                url = f"http://localhost:7860{url}"
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
            prompt=prompt,
            model_name=model_name,
        )
        text = result.get("caption", "")
        used_model = model_name or "STUB_MODEL"
        raw = result.get("raw_response", {})
        metadata = result.get("metadata", {})
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
        prompt=prompt,
        model_code=used_model,
        raw_json=raw,
        text=text,
        metadata=metadata,
    )
    
    db.refresh(c)
    
    from .upload import convert_image_to_dict
    try:
        url = storage.generate_presigned_url(c.file_key, expires_in=3600)
        # For local storage, ensure we have a full URL
        if url.startswith('/') and storage.settings.STORAGE_PROVIDER == "local":
            url = f"http://localhost:7860{url}"
    except Exception:
        url = f"/api/images/{c.image_id}/file"
    
    if url and url.startswith('/'):
        url = f"{settings.BASE_URL}{url}"
    
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
        url = storage.generate_presigned_url(caption.file_key, expires_in=3600)
        # For local storage, ensure we have a full URL
        if url.startswith('/') and storage.settings.STORAGE_PROVIDER == "local":
            url = f"http://localhost:7860{url}"
    except Exception:
        url = f"/api/images/{caption.image_id}/file"
    

    if url and url.startswith('/'):
        url = f"{settings.BASE_URL}{url}"
    
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
            url = storage.generate_presigned_url(caption.file_key, expires_in=3600)
        except Exception:
            url = f"/api/images/{caption.image_id}/file"
        
        if url and url.startswith('/'):
            url = f"{settings.BASE_URL}{url}"
        
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
            url = storage.generate_presigned_url(caption.file_key, expires_in=3600)
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
        url = storage.generate_presigned_url(caption.file_key, expires_in=3600)
    except Exception:
        url = f"/api/images/{caption.image_id}/file"
    
    if url and url.startswith('/'):
        url = f"{settings.BASE_URL}{url}"
    
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
