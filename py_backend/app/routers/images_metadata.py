"""
Image Metadata Router
Handles metadata updates and image deletion
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
import datetime

from .. import crud, schemas, database, storage
from ..utils.image_utils import convert_image_to_dict

logger = logging.getLogger(__name__)
router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.put("/{image_id}")
def update_image_metadata(
    image_id: str,
    metadata: schemas.ImageMetadataUpdate,
    db: Session = Depends(get_db)
):
    """Update image metadata (source, type, epsg, image_type, countries)"""
    logger.debug(f"Updating metadata for image {image_id}")
    logger.debug(f"Metadata received: {metadata}")
    
    img = crud.get_image(db, image_id)
    if not img:
        logger.warning(f"Image {image_id} not found in database")
        raise HTTPException(404, "Image not found")
    
    logger.debug(f"Found image {image_id} in database")
    
    try:
        # Update basic fields
        if metadata.source is not None:
            img.source = metadata.source
        if metadata.event_type is not None:
            img.event_type = metadata.event_type
        if metadata.epsg is not None:
            img.epsg = metadata.epsg
        if metadata.image_type is not None:
            img.image_type = metadata.image_type
        
        # Handle starred field - update the first caption's starred status
        if metadata.starred is not None:
            if img.captions:
                # Update the first caption's starred status
                img.captions[0].starred = metadata.starred
            else:
                # If no captions exist, create a minimal caption with starred status
                from .. import models
                caption = models.Captions(
                    title="",
                    starred=metadata.starred,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(caption)
                img.captions.append(caption)
        
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
        
        # Update countries
        if metadata.countries is not None:
            logger.debug(f"Updating countries to: {metadata.countries}")
            img.countries.clear()
            for country_code in metadata.countries:
                country = crud.get_country(db, country_code)
                if country:
                    img.countries.append(country)
                    logger.debug(f"Added country: {country_code}")
        
        db.commit()
        db.refresh(img)
        logger.info(f"Metadata update successful for image {image_id}")
        
        # Generate image URL
        try:
            url = storage.get_object_url(img.file_key)
        except Exception:
            url = f"/api/images/{img.image_id}/file"
        
        img_dict = convert_image_to_dict(img, url)
        return schemas.ImageOut(**img_dict)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Metadata update failed for image {image_id}: {str(e)}")
        raise HTTPException(500, f"Failed to update image metadata: {str(e)}")

@router.delete("/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db), content_management: bool = False):
    """Delete an image and its associated caption data
    
    Args:
        image_id: The ID of the image to delete
        content_management: If True, this is a content management delete (from map details)
    """
    logger.info(f"Deleting image {image_id} (content_management={content_management})")
    
    img = crud.get_image(db, image_id)
    if not img:
        logger.warning(f"Image {image_id} not found")
        raise HTTPException(404, "Image not found")
    
    try:
        # Delete associated captions first
        for caption in img.captions:
            db.delete(caption)
            logger.debug(f"Deleted caption {caption.caption_id}")
        
        # Delete the image
        db.delete(img)
        db.commit()
        
        logger.info(f"Successfully deleted image {image_id}")
        return {"message": "Image deleted successfully", "image_id": image_id}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete image {image_id}: {str(e)}")
        raise HTTPException(500, f"Failed to delete image: {str(e)}")
