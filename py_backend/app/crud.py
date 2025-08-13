import io, hashlib
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from fastapi import HTTPException

def hash_bytes(data: bytes) -> str:
    """Compute SHA-256 hex digest of the data."""
    return hashlib.sha256(data).hexdigest()

def create_image(db: Session, src, type_code, key, sha, countries: list[str], epsg: Optional[str], image_type: str):
    """Insert into images and image_countries."""
    img = models.Images(
        source=src, event_type=type_code,
        file_key=key, sha256=sha, epsg=epsg, image_type=image_type
    )
    db.add(img)
    db.flush()

    for c in countries:
        country = db.get(models.Country, c)
        if country:
            img.countries.append(country)

    db.commit()
    db.refresh(img)
    return img

def get_images(db: Session):
    """Get all images with their countries"""
    return (
        db.query(models.Images)
        .options(
            joinedload(models.Images.countries),
        )
        .all()
    )

def get_image(db: Session, image_id: str):
    """Get a single image by ID with its countries"""
    return (
        db.query(models.Images)
        .options(
            joinedload(models.Images.countries),
        )
        .filter(models.Images.image_id == image_id)
        .first()
    )

def create_caption(db: Session, image_id, title, prompt, model_code, raw_json, text, metadata=None):
    print(f"Creating caption for image_id: {image_id}")
    print(f"Caption data: title={title}, prompt={prompt}, model={model_code}")
    print(f"Database session ID: {id(db)}")
    print(f"Database session is active: {db.is_active}")
    
    if metadata:
        raw_json["extracted_metadata"] = metadata
    
    img = db.get(models.Images, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    img.title = title
    img.prompt = prompt
    img.model = model_code
    img.schema_id = "default_caption@1.0.0"
    img.raw_json = raw_json
    img.generated = text
    img.edited = text
    
    print(f"About to commit caption to database...")
    db.commit()
    print(f"Caption commit successful!")
    db.refresh(img)
    print(f"Caption created successfully for image: {img.image_id}")
    return img

def get_caption(db: Session, image_id: str):
    """Get caption data for a specific image"""
    return db.get(models.Images, image_id)

def get_captions_by_image(db: Session, image_id: str):
    """Get caption data for a specific image (now just returns the image)"""
    img = db.get(models.Images, image_id)
    if img and img.title:
        return [img]
    return []

def get_all_captions_with_images(db: Session):
    """Get all images that have caption data"""
    print(f"DEBUG: Querying database for images with caption data...")
    
    total_images = db.query(models.Images).count()
    print(f"DEBUG: Total images in database: {total_images}")

    images_with_title = db.query(models.Images).filter(
        models.Images.title.isnot(None)
    ).count()
    print(f"DEBUG: Images with title field: {images_with_title}")
    
    images_with_generated = db.query(models.Images).filter(
        models.Images.generated.isnot(None)
    ).count()
    print(f"DEBUG: Images with generated field: {images_with_generated}")
    
    images_with_model = db.query(models.Images).filter(
        models.Images.model.isnot(None)
    ).count()
    print(f"DEBUG: Images with model field: {images_with_model}")
    
    results = db.query(models.Images).filter(
        models.Images.title.isnot(None)
    ).all()
    
    print(f"DEBUG: Query returned {len(results)} results")
    for img in results:
        print(f"DEBUG: Image {img.image_id}: title='{img.title}', generated='{img.generated}', model='{img.model}'")
    
    return results

def update_caption(db: Session, image_id: str, update: schemas.CaptionUpdate):
    """Update caption data for an image"""
    img = db.get(models.Images, image_id)
    if not img:
        return None
    
    for field, value in update.dict(exclude_unset=True).items():
        setattr(img, field, value)
    
    db.commit()
    db.refresh(img)
    return img

def delete_caption(db: Session, image_id: str):
    """Delete caption data for an image (sets caption fields to None)"""
    img = db.get(models.Images, image_id)
    if not img:
        return False
    
    img.title = None
    img.prompt = None
    img.model = None
    img.schema_id = None
    img.raw_json = None
    img.generated = None
    img.edited = None
    img.accuracy = None
    img.context = None
    img.usability = None
    img.starred = False
    
    db.commit()
    return True

def get_sources(db: Session):
    """Get all sources for lookup"""
    return db.query(models.Source).all()

def get_regions(db: Session):
    """Get all regions for lookup"""
    return db.query(models.Region).all()

def get_types(db: Session):
    """Get all types for lookup"""
    return db.query(models.EventType).all()

def get_spatial_references(db: Session):
    """Get all spatial references for lookup"""
    return db.query(models.SpatialReference).all()

def get_image_types(db: Session):
    """Get all image types for lookup"""
    return db.query(models.ImageTypes).all()

def get_countries(db: Session):
    """Get all countries for lookup"""
    return db.query(models.Country).all()

def get_country(db: Session, c_code: str):
    """Get a single country by code"""
    return db.get(models.Country, c_code)

def get_models(db: Session):
    """Get all models"""
    return db.query(models.Models).all()

def get_model(db: Session, m_code: str):
    """Get a specific model by code"""
    return db.get(models.Models, m_code)
