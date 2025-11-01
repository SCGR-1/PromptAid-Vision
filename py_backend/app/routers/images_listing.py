"""
Image Listing Router
Handles listing, pagination, and filtering of images
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Union
import logging

from .. import crud, schemas, database
from ..utils.image_utils import convert_image_to_dict

logger = logging.getLogger(__name__)
router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.ImageOut])
def list_images(db: Session = Depends(get_db)):
    """Get all images with their caption data"""
    logger.debug("Listing all images")
    images = crud.get_images(db)
    url_cache: dict[str, str] = {}
    result = []
    for img in images:
        img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file", url_cache=url_cache)
        result.append(schemas.ImageOut(**img_dict))
    
    logger.info(f"Returned {len(result)} images")
    return result

@router.get("/grouped", response_model=Union[List[schemas.ImageOut], schemas.PaginatedImageOut])
def list_images_grouped(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    source: str = Query(None),
    event_type: str = Query(None),
    region: str = Query(None),
    country: str = Query(None),
    image_type: str = Query(None),
    upload_type: Optional[str] = Query(None),
    starred_only: bool = Query(False),
    include_count: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get paginated and filtered images
    
    If include_count=true, returns {items: [], total_count: N} format.
    Otherwise returns array format for backward compatibility.
    """
    logger.debug(f"Listing grouped images - page: {page}, limit: {limit}")
    
    # Build filter parameters
    filters = {}
    if search:
        filters['search'] = search
    if source:
        filters['source'] = source
    if event_type:
        filters['event_type'] = event_type
    if region:
        filters['region'] = region
    if country:
        filters['country'] = country
    if image_type:
        filters['image_type'] = image_type
    if upload_type:
        filters['upload_type'] = upload_type
    if starred_only:
        filters['starred_only'] = starred_only
    
    logger.debug(f"Applied filters: {filters}")
    
    # Get total count if requested
    total_count = None
    if include_count:
        total_count = crud.get_images_count(db, **filters)
        logger.debug(f"Total count: {total_count}")
    
    # Get paginated results
    images = crud.get_images_paginated(
        db, 
        page=page, 
        limit=limit, 
        **filters
    )
    
    url_cache: dict[str, str] = {}
    result = []
    for img in images:
        img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file", url_cache=url_cache)
        result.append(schemas.ImageOut(**img_dict))
    
    logger.info(f"Returned {len(result)} images for page {page}")
    
    if include_count:
        return {"items": result, "total_count": total_count}
    return result

@router.get("/grouped/count")
def get_images_grouped_count(
    search: str = Query(None),
    source: str = Query(None),
    event_type: str = Query(None),
    region: str = Query(None),
    country: str = Query(None),
    image_type: str = Query(None),
    db: Session = Depends(get_db)
):
    """Get total count of images matching filters"""
    logger.debug("Getting images count")
    
    # Build filter parameters
    filters = {}
    if search:
        filters['search'] = search
    if source:
        filters['source'] = source
    if event_type:
        filters['event_type'] = event_type
    if region:
        filters['region'] = region
    if country:
        filters['country'] = country
    if image_type:
        filters['image_type'] = image_type
    
    count = crud.get_images_count(db, **filters)
    logger.info(f"Total images count: {count}")
    return {"count": count}

@router.get("/{image_id}", response_model=schemas.ImageOut)
def get_image(image_id: str, db: Session = Depends(get_db)):
    """Get a specific image by ID"""
    logger.debug(f"Getting image: {image_id}")
    
    img = crud.get_image(db, image_id)
    if not img:
        logger.warning(f"Image not found: {image_id}")
        from fastapi import HTTPException
        raise HTTPException(404, "Image not found")
    
    img_dict = convert_image_to_dict(img, f"/api/images/{img.image_id}/file")
    logger.info(f"Returned image: {image_id}")
    return schemas.ImageOut(**img_dict)
