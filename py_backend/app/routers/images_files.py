"""
Image File Operations Router
Handles file serving, copying, and preprocessing operations
"""
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import io
import os
import time
import mimetypes

from .. import crud, schemas, database, storage
from ..config import settings
from ..services.image_preprocessor import ImagePreprocessor

logger = logging.getLogger(__name__)
router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
            file_path = os.path.join(settings.STORAGE_DIR, img.file_key)
            logger.debug(f"Reading from: {file_path}")
            logger.debug(f"File exists: {os.path.exists(file_path)}")
            
            if not os.path.exists(file_path):
                logger.error(f"File not found at: {file_path}")
                raise FileNotFoundError(f"Image file not found: {file_path}")
            
            with open(file_path, 'rb') as f:
                content = f.read()
            
            logger.debug(f"Read {len(content)} bytes from file")
        
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

@router.post("/copy", response_model=schemas.ImageOut)
async def copy_image_for_contribution(
    request: CopyImageRequest,
    db: Session = Depends(get_db)
):
    """Copy an existing image for contribution purposes, creating a new image_id"""
    logger.info(f"Copying image {request.source_image_id} for contribution")
    
    source_img = crud.get_image(db, request.source_image_id)
    if not source_img:
        logger.warning(f"Source image not found: {request.source_image_id}")
        raise HTTPException(404, "Source image not found")
    
    try:
        # Get image content from storage
        if hasattr(storage, 's3') and settings.STORAGE_PROVIDER != "local":
            response = storage.s3.get_object(
                Bucket=settings.S3_BUCKET,
                Key=source_img.file_key,
            )
            image_content = response["Body"].read()
        else:
            file_path = os.path.join(settings.STORAGE_DIR, source_img.file_key)
            with open(file_path, 'rb') as f:
                image_content = f.read()
        
        # Create new file with unique name
        new_filename = f"contribution_{request.source_image_id}_{int(time.time())}.jpg"
        new_key = storage.upload_fileobj(io.BytesIO(image_content), new_filename)
        
        # Parse countries
        countries_list = [c.strip() for c in request.countries.split(',') if c.strip()] if request.countries else []
        
        # Create new image record
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
        
        # Generate URL
        try:
            url = storage.get_object_url(new_key)
        except Exception as e:
            url = f"/api/images/{new_img.image_id}/file"
        
        # Convert to response format
        from ..utils.image_utils import convert_image_to_dict
        img_dict = convert_image_to_dict(new_img, url)
        result = schemas.ImageOut(**img_dict)
        
        logger.info(f"Successfully copied image {request.source_image_id} -> {new_img.image_id}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to copy image: {str(e)}")
        raise HTTPException(500, f"Failed to copy image: {str(e)}")

@router.post("/preprocess")
async def preprocess_image(
    file: UploadFile = Form(...),
    db: Session = Depends(get_db)
):
    """Preprocess an image file (convert format, optimize, etc.)"""
    logger.info(f"Preprocessing image: {file.filename}")
    
    try:
        content = await file.read()
        
        # Preprocess the image
        processed_content, processed_filename, mime_type = ImagePreprocessor.preprocess_image(
            content, 
            file.filename,
            target_format='PNG',
            quality=95
        )
        
        logger.info(f"Image preprocessed: {file.filename} -> {processed_filename}")
        
        return {
            "original_filename": file.filename,
            "processed_filename": processed_filename,
            "original_size": len(content),
            "processed_size": len(processed_content),
            "mime_type": mime_type,
            "preprocessing_applied": processed_filename != file.filename
        }
        
    except Exception as e:
        logger.error(f"Image preprocessing failed: {str(e)}")
        raise HTTPException(500, f"Image preprocessing failed: {str(e)}")
