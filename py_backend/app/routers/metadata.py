from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, database, schemas

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.put("/captions/{caption_id}/metadata", response_model=schemas.CaptionOut)
def update_metadata(
    caption_id: str,
    update: schemas.CaptionUpdate,
    db: Session = Depends(get_db)
):
    caption = crud.update_caption(db, caption_id, update)
    if not caption:
        raise HTTPException(404, "caption not found")
    return schemas.CaptionOut.from_orm(caption)

@router.get("/sources", response_model=List[schemas.SourceOut])
def get_sources(db: Session = Depends(get_db)):
    """Get all sources for lookup"""
    return crud.get_sources(db)

@router.get("/regions", response_model=List[schemas.RegionOut])
def get_regions(db: Session = Depends(get_db)):
    """Get all regions for lookup"""
    return crud.get_regions(db)

@router.get("/types", response_model=List[schemas.TypeOut])
def get_types(db: Session = Depends(get_db)):
    """Get all types for lookup"""
    return crud.get_types(db)

@router.get("/spatial-references", response_model=List[schemas.SpatialReferenceOut])
def get_spatial_references(db: Session = Depends(get_db)):
    """Get all spatial references for lookup"""
    return crud.get_spatial_references(db)

@router.get("/image-types", response_model=List[schemas.ImageTypeOut])
def get_image_types(db: Session = Depends(get_db)):
    """Get all image types for lookup"""
    return crud.get_image_types(db)

@router.get("/countries", response_model=List[schemas.CountryOut])
def get_countries(db: Session = Depends(get_db)):
    """Get all countries for lookup"""
    return crud.get_countries(db)
