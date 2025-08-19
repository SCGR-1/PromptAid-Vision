from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException, Response
from pydantic import BaseModel
import io
from sqlalchemy.orm import Session
from .. import crud, schemas, storage, database
from ..config import settings
from typing import List, Optional
import boto3
import time

router = APIRouter()

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
            print(f"Warning: Error processing countries for image {img.image_id}: {e}")
            countries_list = []
    
    img_dict = {
        "image_id": img.image_id,
        "file_key": img.file_key,
        "sha256": img.sha256,
        "source": img.source,
        "event_type": img.event_type,
        "epsg": img.epsg,
        "image_type": img.image_type,
        "image_url": image_url,
        "countries": countries_list,
        "title": img.title,
        "prompt": img.prompt,
        "model": img.model,
        "schema_id": img.schema_id,
        "raw_json": img.raw_json,
        "generated": img.generated,
        "edited": img.edited,
        "accuracy": img.accuracy,
        "context": img.context,
        "usability": img.usability,
        "starred": img.starred if img.starred is not None else False,
        "created_at": img.created_at,
        "updated_at": img.updated_at,
        
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
    source: Optional[str] = Form(default=None),
    event_type: str    = Form(default="OTHER"),
    countries: str     = Form(default=""),
    epsg: str          = Form(default=""),
    image_type: str    = Form(default="crisis_map"),
    file: UploadFile   = Form(...),
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
    sha     = crud.hash_bytes(content)

    key = storage.upload_fileobj(io.BytesIO(content), file.filename)

    try:
        img = crud.create_image(
            db, source, event_type, key, sha, countries_list, epsg, image_type,
            center_lon, center_lat, amsl_m, agl_m, heading_deg, yaw_deg, pitch_deg, roll_deg,
            rtk_fix, std_h_m, std_v_m
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to save image to database: {str(e)}")

    try:
        url = storage.get_object_url(key)
    except Exception as e:
        url = f"/api/images/{img.image_id}/file"

    img_dict = convert_image_to_dict(img, url)
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
    print(f"🔍 Serving image file for image_id: {image_id}")
    
    img = crud.get_image(db, image_id)
    if not img:
        print(f"❌ Image not found: {image_id}")
        raise HTTPException(404, "Image not found")
    
    print(f"✅ Found image: {img.image_id}, file_key: {img.file_key}")
    
    try:
        if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
            print(f"🔍 Using S3 storage - redirecting to S3 URL")
            try:
                url = storage.get_object_url(img.file_key)
                from fastapi.responses import RedirectResponse
                return RedirectResponse(url=url, status_code=302)
            except Exception as e:
                print(f"❌ Failed to generate S3 URL: {e}")
                # Fallback to direct S3 object serving
                response = storage.s3.get_object(Bucket=settings.S3_BUCKET, Key=img.file_key)
                content = response['Body'].read()
        else:
            print(f"🔍 Using local storage")
            import os
            file_path = os.path.join(settings.STORAGE_DIR, img.file_key)
            print(f"📁 Reading from: {file_path}")
            print(f"📁 File exists: {os.path.exists(file_path)}")
            
            if not os.path.exists(file_path):
                print(f"❌ File not found at: {file_path}")
                raise FileNotFoundError(f"Image file not found: {file_path}")
            
            with open(file_path, 'rb') as f:
                content = f.read()
            
            print(f"✅ Read {len(content)} bytes from file")
        
        import mimetypes
        content_type, _ = mimetypes.guess_type(img.file_key)
        if not content_type:
            content_type = 'application/octet-stream'
        
        print(f"✅ Serving image with content-type: {content_type}, size: {len(content)} bytes")
        return Response(content=content, media_type=content_type)
    except Exception as e:
        print(f"❌ Error serving image: {e}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        raise HTTPException(500, f"Failed to serve image file: {e}")

@router.put("/{image_id}")
def update_image_metadata(
    image_id: str,
    metadata: schemas.ImageMetadataUpdate,
    db: Session = Depends(get_db)
):
    """Update image metadata (source, type, epsg, image_type, countries)"""
    print(f"DEBUG: Updating metadata for image {image_id}")
    print(f"DEBUG: Metadata received: {metadata}")
    
    img = crud.get_image(db, image_id)
    if not img:
        print(f"DEBUG: Image {image_id} not found in database")
        raise HTTPException(404, "Image not found")
    
    print(f"DEBUG: Found image {image_id} in database")
    
    try:
        if metadata.source is not None:
            img.source = metadata.source
        if metadata.event_type is not None:
            img.event_type = metadata.event_type
        if metadata.epsg is not None:
            img.epsg = metadata.epsg
        if metadata.image_type is not None:
            img.image_type = metadata.image_type
        if metadata.starred is not None:
            img.starred = metadata.starred
        
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
            print(f"DEBUG: Updating countries to: {metadata.countries}")
            img.countries.clear()
            for country_code in metadata.countries:
                country = crud.get_country(db, country_code)
                if country:
                    img.countries.append(country)
                    print(f"DEBUG: Added country: {country_code}")
        
        db.commit()
        db.refresh(img)
        print(f"DEBUG: Metadata update successful for image {image_id}")
        
        try:
            url = storage.get_object_url(img.file_key)
        except Exception:
            url = f"/api/images/{img.image_id}/file"
        
        img_dict = convert_image_to_dict(img, url)
        return schemas.ImageOut(**img_dict)
        
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Metadata update failed for image {image_id}: {str(e)}")
        raise HTTPException(500, f"Failed to update image metadata: {str(e)}")

@router.delete("/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db)):
    """Delete an image and its associated caption data"""
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    db.delete(img)
    db.commit()
    
    return {"message": "Image deleted successfully"}
