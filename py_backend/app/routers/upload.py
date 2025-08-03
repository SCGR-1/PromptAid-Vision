from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException, Response
import io
from sqlalchemy.orm import Session
from .. import crud, schemas, storage, database
from typing import List
import boto3

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    print(f"Created database session: {id(db)}")
    try:
        yield db
    finally:
        print(f"Closing database session: {id(db)}")
        db.close()


@router.get("/", response_model=List[schemas.ImageOut])
def list_images(db: Session = Depends(get_db)):
    """Get all images with their captions"""
    images = crud.get_images(db)
    result = []
    for img in images:
        # Convert SQLAlchemy model to dict for Pydantic
        img_dict = {
            "image_id": img.image_id,
            "file_key": img.file_key,
            "sha256": img.sha256,
            "source": img.source,
            "type": img.type,
            "epsg": img.epsg,
            "image_type": img.image_type,
            "image_url": f"/api/images/{img.image_id}/file",
            "countries": [{"c_code": c.c_code, "label": c.label, "r_code": c.r_code} for c in img.countries],
            "caption": None
        }
        
        # Convert caption if it exists
        if img.caption:
            img_dict["caption"] = {
                "cap_id": img.caption.cap_id,
                "image_id": img.caption.image_id,
                "title": img.caption.title,
                "prompt": img.caption.prompt,
                "model": img.caption.model,
                "raw_json": img.caption.raw_json,
                "generated": img.caption.generated,
                "edited": img.caption.edited,
                "accuracy": img.caption.accuracy,
                "context": img.caption.context,
                "usability": img.caption.usability,
                "starred": img.caption.starred
            }
        
        result.append(schemas.ImageOut(**img_dict))
    
    print(f"Returning {len(result)} images")
    return result

@router.get("/{image_id}", response_model=schemas.ImageOut)
def get_image(image_id: str, db: Session = Depends(get_db)):
    """Get a single image by ID"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    # Convert SQLAlchemy model to dict for Pydantic
    img_dict = {
        "image_id": img.image_id,
        "file_key": img.file_key,
        "sha256": img.sha256,
        "source": img.source,
        "type": img.type,
        "epsg": img.epsg,
        "image_type": img.image_type,
        "image_url": f"/api/images/{img.image_id}/file",
        "countries": [{"c_code": c.c_code, "label": c.label, "r_code": c.r_code} for c in img.countries],
        "caption": None
    }
    
    # Convert caption if it exists
    if img.caption:
        img_dict["caption"] = {
            "cap_id": img.caption.cap_id,
            "image_id": img.caption.image_id,
            "title": img.caption.title,
            "prompt": img.caption.prompt,
            "model": img.caption.model,
            "raw_json": img.caption.raw_json,
            "generated": img.caption.generated,
            "edited": img.caption.edited,
            "accuracy": img.caption.accuracy,
            "context": img.caption.context,
            "usability": img.caption.usability,
            "starred": img.caption.starred
        }
    
    return schemas.ImageOut(**img_dict)


@router.post("/", response_model=schemas.ImageOut)
async def upload_image(
    source: str        = Form(...),
    type: str          = Form(...),
    countries: list[str] = Form([]),
    epsg: str          = Form(...),
    image_type: str    = Form(...),
    file: UploadFile   = Form(...),
    db: Session        = Depends(get_db)
):
    print(f"Starting upload for file: {file.filename}")
    print(f"Upload parameters: source={source}, type={type}, countries={countries}, epsg={epsg}, image_type={image_type}")
    
    # 1) read & hash
    content = await file.read()
    sha     = crud.hash_bytes(content)
    print(f"File read successfully, size: {len(content)} bytes, SHA256: {sha[:16]}...")

    # 2) upload to S3/MinIO (or local FS)
    key = storage.upload_fileobj(io.BytesIO(content), file.filename)
    print(f"File uploaded to storage with key: {key}")

    # 3) persist the DB record
    try:
        img = crud.create_image(db, source, type, key, sha, countries, epsg, image_type)
        print(f"Image saved to database with ID: {img.image_id}")
    except Exception as e:
        print(f"Error saving image to database: {e}")
        raise HTTPException(500, f"Failed to save image to database: {str(e)}")

    # 4) generate a URL for your front‑end
    try:
        url = storage.generate_presigned_url(key, expires_in=3600)
    except Exception as e:
        # fallback: if you're serving via StaticFiles("/uploads")
        url = f"/api/images/{img.image_id}/file"
        print(f"Warning: Could not generate presigned URL, using fallback: {e}")

    # 5) return the Image plus that URL
    result = schemas.ImageOut(
        image_id    = img.image_id,
        file_key  = img.file_key,
        sha256    = img.sha256,
        source    = img.source,
        type      = img.type,
        epsg      = img.epsg,
        image_type = img.image_type,
        image_url = url,
        caption   = None,  # Will be populated when caption is created
    )
    print(f"Upload completed successfully, returning image_id: {img.image_id}")
    return result

@router.get("/{image_id}/file")
async def get_image_file(image_id: str, db: Session = Depends(get_db)):
    """Serve the actual image file"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    try:
        # Get the file from S3/MinIO
        response = storage.s3.get_object(Bucket=storage.settings.S3_BUCKET, Key=img.file_key)
        content = response['Body'].read()
        
        # Determine content type based on file extension
        import mimetypes
        content_type, _ = mimetypes.guess_type(img.file_key)
        if not content_type:
            content_type = 'application/octet-stream'
        
        return Response(content=content, media_type=content_type)
    except Exception as e:
        print(f"Error serving image file {image_id}: {e}")
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
        # Update metadata fields
        if metadata.source is not None:
            img.source = metadata.source
        if metadata.type is not None:
            img.type = metadata.type
        if metadata.epsg is not None:
            img.epsg = metadata.epsg
        if metadata.image_type is not None:
            img.image_type = metadata.image_type
        if metadata.countries is not None:
            # Clear existing countries and add new ones
            img.countries = []
            for country_code in metadata.countries:
                country = crud.get_country(db, country_code)
                if country:
                    img.countries.append(country)
        
        db.commit()
        return {"message": "Image metadata updated successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error updating image metadata: {e}")
        raise HTTPException(500, f"Failed to update image metadata: {str(e)}")

@router.delete("/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db)):
    """Delete an image and its associated caption"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    # Delete the image (this will cascade delete the caption due to CASCADE constraint)
    db.delete(img)
    db.commit()
    
    return {"message": "Image deleted successfully"}
