from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from .. import crud, database, schemas, storage
import io

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Stub captioner for now ---
class CaptionerStub:
    def generate(self, image_bytes: bytes) -> tuple[str,str,dict]:
        text = "This is a fake caption."
        model = "STUB_MODEL"
        raw = {"stub": True}
        return text, model, raw

cap = CaptionerStub()

@router.post("/images/{image_id}/caption", response_model=schemas.CaptionOut)
def create_caption(
    image_id: str, 
    title: str = Form(...), 
    prompt: str = Form(...), 
    db: Session = Depends(get_db)
):
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "image not found")

    try:
        # fetch image bytes from S3/MinIO directly
        try:
            response = storage.s3.get_object(Bucket=storage.settings.S3_BUCKET, Key=img.file_key)
            img_bytes = response['Body'].read()
            print(f"Successfully fetched image {img.image_id} from S3/MinIO")
        except Exception as e:
            print(f"Failed to fetch from S3/MinIO: {e}, trying presigned URL fallback")
            # Fallback to presigned URL
            url = storage.generate_presigned_url(img.file_key)
            
            # Try requests first, fallback to httpx
            try:
                import requests
                resp = requests.get(url)
                resp.raise_for_status()
                img_bytes = resp.content
            except ImportError:
                # Fallback to httpx if requests is not available
                import httpx
                with httpx.Client() as client:
                    resp = client.get(url)
                    resp.raise_for_status()
                    img_bytes = resp.content

        # generate caption
        text, model, raw = cap.generate(img_bytes)
        print(f"Generated caption for image {image_id}: {text[:100]}...")

        # insert into DB
        c = crud.create_caption(db, image_id, title, prompt, model, raw, text)
        print(f"Created caption {c.cap_id} for image {image_id}")
        return c
        
    except Exception as e:
        raise HTTPException(500, f"Failed to generate caption: {str(e)}")

@router.get("/captions/{cap_id}", response_model=schemas.CaptionOut)
def get_caption(cap_id: str, db: Session = Depends(get_db)):
    c = crud.get_caption(db, cap_id)
    if not c:
        raise HTTPException(404, "caption not found")
    return c

@router.put("/captions/{cap_id}", response_model=schemas.CaptionOut)
def update_caption(cap_id: str, update: schemas.CaptionUpdate, db: Session = Depends(get_db)):
    c = crud.update_caption(db, cap_id, **update.dict())
    if not c:
        raise HTTPException(404, "caption not found")
    return c
