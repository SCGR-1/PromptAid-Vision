# app/routers/caption.py

from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from .. import crud, database, schemas, storage
from ..services.vlm_service import vlm_manager

# Initialize VLM services
from ..services.stub_vlm_service import StubVLMService
from ..services.gpt4v_service import GPT4VService
from ..services.gemini_service import GeminiService
from ..services.huggingface_service import LLaVAService, BLIP2Service, InstructBLIPService
from ..config import settings

# Register stub service
stub_service = StubVLMService()
vlm_manager.register_service(stub_service)

# Register GPT-4 Vision service (if API key is available)
if settings.OPENAI_API_KEY:
    try:
        gpt4v_service = GPT4VService(settings.OPENAI_API_KEY)
        vlm_manager.register_service(gpt4v_service)
        print(f"DEBUG: Registered GPT-4 Vision service: {gpt4v_service.model_name}")
    except Exception as e:
        print(f"DEBUG: Failed to register GPT-4 Vision service: {e}")
else:
    print("DEBUG: No OpenAI API key found")

# Register Gemini service (if API key is available)
if settings.GOOGLE_API_KEY:
    try:
        gemini_service = GeminiService(settings.GOOGLE_API_KEY)
        vlm_manager.register_service(gemini_service)
        print(f"DEBUG: Registered Gemini service: {gemini_service.model_name}")
    except Exception as e:
        print(f"DEBUG: Failed to register Gemini service: {e}")
else:
    print("DEBUG: No Google API key found")

# Register Hugging Face services (if API key is available)
if settings.HF_API_KEY:
    print(f"DEBUG: Hugging Face API key found: {settings.HF_API_KEY[:10]}...")
    try:
        # Register popular vision-language models
        llava_service = LLaVAService(settings.HF_API_KEY)
        vlm_manager.register_service(llava_service)
        print(f"DEBUG: Registered LLaVA service: {llava_service.model_name}")
        
        blip2_service = BLIP2Service(settings.HF_API_KEY)
        vlm_manager.register_service(blip2_service)
        print(f"DEBUG: Registered BLIP2 service: {blip2_service.model_name}")
        
        instructblip_service = InstructBLIPService(settings.HF_API_KEY)
        vlm_manager.register_service(instructblip_service)
        print(f"DEBUG: Registered InstructBLIP service: {instructblip_service.model_name}")
        
        print("DEBUG: Successfully registered Hugging Face services")
    except Exception as e:
        print(f"DEBUG: Failed to register Hugging Face services: {e}")
        import traceback
        traceback.print_exc()
else:
    print("DEBUG: No Hugging Face API key found")

# Debug: Print registered services
print(f"DEBUG: Registered services: {list(vlm_manager.services.keys())}")
print(f"DEBUG: Available models: {vlm_manager.get_available_models()}")

router = APIRouter()

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
    prompt: str = Form(...),
    model_name: str | None = Form(None),          # ← pull in your selected VLM
    db: Session = Depends(get_db),
):
    # 1) ensure image exists
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "image not found")

    # 2) fetch raw bytes
    try:
        response = storage.s3.get_object(
            Bucket=storage.settings.S3_BUCKET,
            Key=img.file_key,
        )
        img_bytes = response["Body"].read()
    except Exception:
        # fallback via presigned URL
        url = storage.generate_presigned_url(img.file_key)
        import requests
        resp = requests.get(url)
        resp.raise_for_status()
        img_bytes = resp.content

    # 3) generate via VLM
    metadata = {}
    try:
        print(f"DEBUG: calling VLM with model={model_name}")
        result = await vlm_manager.generate_caption(
            image_bytes=img_bytes,
            prompt=prompt,
            model_name=model_name,
        )
        text = result.get("caption", "")
        used_model = result.get("model", "UNKNOWN_MODEL")
        raw = result.get("raw_response", {})
        metadata = result.get("metadata", {})
        print(f"DEBUG: got caption: {text[:100]}… (model={used_model})")
        print(f"DEBUG: extracted metadata: {metadata}")
    except Exception as e:
        print(f"DEBUG: VLM error, falling back: {e}")
        text = "This is a fallback caption due to VLM service error."
        used_model = "STUB_MODEL"
        raw = {"error": str(e), "fallback": True}
        metadata = {}

    # 4) persist and return
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
    return c

@router.get(
    "/captions/{cap_id}",
    response_model=schemas.CaptionOut,
)
def get_caption(
    cap_id: str,
    db: Session = Depends(get_db),
):
    c = crud.get_caption(db, cap_id)
    if not c:
        raise HTTPException(404, "caption not found")
    return c

@router.put(
    "/captions/{cap_id}",
    response_model=schemas.CaptionOut,
)
def update_caption(
    cap_id: str,
    update: schemas.CaptionUpdate,
    db: Session = Depends(get_db),
):
    c = crud.update_caption(db, cap_id, **update.dict())
    if not c:
        raise HTTPException(404, "caption not found")
    return c
