"""
Simplified Upload Router
Handles only the core upload endpoints, delegating to service layer
"""
from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from .. import schemas, database
from ..services.upload_service import UploadService

logger = logging.getLogger(__name__)
router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.ImageOut)
async def upload_image(
    source: Optional[str] = Form(default=None),
    event_type: str = Form(default="OTHER"),
    countries: str = Form(default=""),
    epsg: str = Form(default=""),
    image_type: str = Form(default="crisis_map"),
    file: UploadFile = Form(...),
    title: str = Form(default=""),
    model_name: Optional[str] = Form(default=None),
    # Drone-specific fields (optional)
    center_lon: Optional[float] = Form(default=None),
    center_lat: Optional[float] = Form(default=None),
    amsl_m: Optional[float] = Form(default=None),
    agl_m: Optional[float] = Form(default=None),
    heading_deg: Optional[float] = Form(default=None),
    yaw_deg: Optional[float] = Form(default=None),
    pitch_deg: Optional[float] = Form(default=None),
    roll_deg: Optional[float] = Form(default=None),
    rtk_fix: Optional[bool] = Form(default=None),
    std_h_m: Optional[float] = Form(default=None),
    std_v_m: Optional[float] = Form(default=None),
    db: Session = Depends(get_db)
):
    """Upload a single image"""
    logger.info(f"Single image upload request: {file.filename}")
    
    try:
        result = await UploadService.process_single_upload(
            file=file,
            source=source,
            event_type=event_type,
            countries=countries,
            epsg=epsg,
            image_type=image_type,
            title=title,
            model_name=model_name,
            center_lon=center_lon,
            center_lat=center_lat,
            amsl_m=amsl_m,
            agl_m=agl_m,
            heading_deg=heading_deg,
            yaw_deg=yaw_deg,
            pitch_deg=pitch_deg,
            roll_deg=roll_deg,
            rtk_fix=rtk_fix,
            std_h_m=std_h_m,
            std_v_m=std_v_m,
            db=db
        )
        
        return result['image']
        
    except Exception as e:
        logger.error(f"Single upload failed: {str(e)}")
        raise HTTPException(500, f"Upload failed: {str(e)}")

@router.post("/multi", response_model=dict)
async def upload_multiple_images(
    files: List[UploadFile] = Form(...),
    source: Optional[str] = Form(default=None),
    event_type: str = Form(default="OTHER"),
    countries: str = Form(default=""),
    epsg: str = Form(default=""),
    image_type: str = Form(default="crisis_map"),
    title: str = Form(default=""),
    model_name: Optional[str] = Form(default=None),
    # Drone-specific fields (optional)
    center_lon: Optional[float] = Form(default=None),
    center_lat: Optional[float] = Form(default=None),
    amsl_m: Optional[float] = Form(default=None),
    agl_m: Optional[float] = Form(default=None),
    heading_deg: Optional[float] = Form(default=None),
    yaw_deg: Optional[float] = Form(default=None),
    pitch_deg: Optional[float] = Form(default=None),
    roll_deg: Optional[float] = Form(default=None),
    rtk_fix: Optional[bool] = Form(default=None),
    std_h_m: Optional[float] = Form(default=None),
    std_v_m: Optional[float] = Form(default=None),
    db: Session = Depends(get_db)
):
    """Upload multiple images"""
    logger.info(f"Multi image upload request: {len(files)} files")
    
    try:
        result = await UploadService.process_multi_upload(
            files=files,
            source=source,
            event_type=event_type,
            countries=countries,
            epsg=epsg,
            image_type=image_type,
            title=title,
            model_name=model_name,
            center_lon=center_lon,
            center_lat=center_lat,
            amsl_m=amsl_m,
            agl_m=agl_m,
            heading_deg=heading_deg,
            yaw_deg=yaw_deg,
            pitch_deg=pitch_deg,
            roll_deg=roll_deg,
            rtk_fix=rtk_fix,
            std_h_m=std_h_m,
            std_v_m=std_v_m,
            db=db
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Multi upload failed: {str(e)}")
        raise HTTPException(500, f"Multi upload failed: {str(e)}")
