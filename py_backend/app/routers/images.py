import hashlib
import mimetypes
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Images, image_countries
from ..images import CreateImageFromUrlIn, CreateImageFromUrlOut
from .. import storage
from ..storage import upload_bytes, get_object_url

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/from-url", response_model=CreateImageFromUrlOut)
async def create_image_from_url(payload: CreateImageFromUrlIn, db: Session = Depends(get_db)):
    print(f"DEBUG: Received payload: {payload}")
    try:
        if payload.url.startswith('/api/images/') and '/file' in payload.url:
            image_id = payload.url.split('/api/images/')[1].split('/file')[0]
            print(f"DEBUG: Extracted image_id: {image_id}")
        else:
            raise HTTPException(status_code=400, detail="Invalid image URL format")
        
        existing_image = db.query(Images).filter(Images.image_id == image_id).first()
        if not existing_image:
            raise HTTPException(status_code=404, detail="Source image not found")
        print(f"DEBUG: Found existing image: {existing_image.image_id}")
        
        try:
            # Try to get image content using storage functions
            if hasattr(storage, 's3') and storage.settings.STORAGE_PROVIDER != "local":
                # S3/MinIO path
                response = storage.s3.get_object(
                    Bucket=storage.settings.S3_BUCKET,
                    Key=existing_image.file_key,
                )
                data = response["Body"].read()
            else:
                # Local storage path - read file directly
                import os
                file_path = os.path.join(storage.settings.STORAGE_DIR, existing_image.file_key)
                with open(file_path, 'rb') as f:
                    data = f.read()
            
            content_type = "image/jpeg"
            print(f"DEBUG: Downloaded image data: {len(data)} bytes")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image from storage: {e}")
        
        if len(data) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image too large")

        ext = mimetypes.guess_extension(content_type) or ".jpg"
        key = upload_bytes(data, filename=f"contributed{ext}", content_type=content_type)
        image_url = get_object_url(key, expires_in=86400)
        print(f"DEBUG: Uploaded new image with key: {key}")

        sha = hashlib.sha256(data).hexdigest()
        print(f"DEBUG: Creating new Images object...")

        img = Images(
            file_key=key,
            sha256=sha,
            source=payload.source,
            event_type=payload.event_type,
            epsg=payload.epsg,
            image_type=payload.image_type,
            title="no title",
            prompt="",
            model="STUB_MODEL",
            schema_id="default_caption@1.0.0",
            raw_json={},
            generated="",
            edited="",
            accuracy=50,
            context=50,
            usability=50,
            starred=False
        )
        print(f"DEBUG: Images object created: {img}")
        db.add(img)
        db.flush()  # get image_id
        print(f"DEBUG: New image_id: {img.image_id}")

        for c in payload.countries:
            db.execute(image_countries.insert().values(image_id=img.image_id, c_code=c))

        db.commit()
        print(f"DEBUG: Database commit successful")

        result = CreateImageFromUrlOut(image_id=str(img.image_id), image_url=image_url)
        print(f"DEBUG: Returning result: {result}")
        return result
        
    except Exception as e:
        print(f"DEBUG: Exception occurred: {type(e).__name__}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create image: {str(e)}")
