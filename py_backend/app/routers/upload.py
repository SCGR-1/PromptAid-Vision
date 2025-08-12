from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException, Response
import io
from sqlalchemy.orm import Session
from .. import crud, schemas, storage, database
from typing import List
import boto3

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def convert_image_to_dict(img, image_url):
    """Helper function to convert SQLAlchemy image model to dict for Pydantic"""
    img_dict = {
        "image_id": img.image_id,
        "file_key": img.file_key,
        "sha256": img.sha256,
        "source": img.source,
        "event_type": img.event_type,
        "epsg": img.epsg,
        "image_type": img.image_type,
        "image_url": image_url,
        "countries": [{"c_code": c.c_code, "label": c.label, "r_code": c.r_code} for c in img.countries],
        "captions": []
    }
    
    if img.captions and len(img.captions) > 0:
        img_dict["captions"] = [{
            "cap_id": caption.cap_id,
            "image_id": caption.image_id,
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
            "updated_at": caption.updated_at
        } for caption in img.captions]
    
    return img_dict


@router.get("/", response_model=List[schemas.ImageOut])
def list_images(db: Session = Depends(get_db)):
    """Get all images with their captions"""
    images = crud.get_images(db)
    result = []
    for img in images:
        img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file")
        result.append(schemas.ImageOut(**img_dict))
    
    return result

@router.get("/{image_id}", response_model=schemas.ImageOut)
def get_image(image_id: str, db: Session = Depends(get_db)):
    """Get a single image by ID"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file")
    return schemas.ImageOut(**img_dict)


@router.post("/", response_model=schemas.ImageOut)
async def upload_image(
    source: str        = Form(default="OTHER"),
    event_type: str    = Form(default="OTHER"),
    countries: str     = Form(default=""),
    epsg: str          = Form(default=""),
    image_type: str    = Form(default="crisis_map"),
    file: UploadFile   = Form(...),
    db: Session        = Depends(get_db)
):
    countries_list = [c.strip() for c in countries.split(',') if c.strip()] if countries else []
    
    if not source or source.strip() == "":
        source = "OTHER"
    if not event_type or event_type.strip() == "":
        event_type = "OTHER"
    if not image_type or image_type.strip() == "":
        image_type = "crisis_map"
    
    if not epsg or epsg.strip() == "":
        epsg = None
    
    content = await file.read()
    sha     = crud.hash_bytes(content)

    key = storage.upload_fileobj(io.BytesIO(content), file.filename)

    try:
        img = crud.create_image(db, source, event_type, key, sha, countries_list, epsg, image_type)
    except Exception as e:
        raise HTTPException(500, f"Failed to save image to database: {str(e)}")

    try:
        url = storage.generate_presigned_url(key, expires_in=3600)
    except Exception as e:
        url = f"/api/images/{img.image_id}/file"

    img_dict = convert_image_to_dict(img, url)
    result = schemas.ImageOut(**img_dict)
    return result

@router.get("/{image_id}/file")
async def get_image_file(image_id: str, db: Session = Depends(get_db)):
    """Serve the actual image file"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    try:
        response = storage.s3.get_object(Bucket=storage.settings.S3_BUCKET, Key=img.file_key)
        content = response['Body'].read()
        
        import mimetypes
        content_type, _ = mimetypes.guess_type(img.file_key)
        if not content_type:
            content_type = 'application/octet-stream'
        
        return Response(content=content, media_type=content_type)
    except Exception as e:
        raise HTTPException(500, "Failed to serve image file")

@router.put("/{image_id}")
def update_image_metadata(
    image_id: str,
    metadata: schemas.ImageMetadataUpdate,
    db: Session = Depends(get_db)
):
    """Update image metadata (source, type, epsg, image_type, countries)"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    try:
        if metadata.source is not None:
            img.source = metadata.source
        if metadata.event_type is not None:
            img.event_type = metadata.event_type
        if metadata.epsg is not None:
            img.epsg = metadata.epsg
        if metadata.image_type is not None:
            img.image_type = metadata.image_type
        if metadata.countries is not None:
            img.countries = []
            for country_code in metadata.countries:
                country = crud.get_country(db, country_code)
                if country:
                    img.countries.append(country)
        
        db.commit()
        return {"message": "Image metadata updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to update image metadata: {str(e)}")

@router.delete("/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db)):
    """Delete an image and its associated caption"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    db.delete(img)
    db.commit()
    
    return {"message": "Image deleted successfully"}
