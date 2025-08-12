import io, hashlib
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from . import models, schemas

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
    """Get all images with their captions"""
    return (
        db.query(models.Images)
        .options(
            joinedload(models.Images.captions),
            joinedload(models.Images.countries),
        )
        .all()
    )

def get_image(db: Session, image_id: str):
    """Get a single image by ID with its captions"""
    return (
        db.query(models.Images)
        .options(
            joinedload(models.Images.captions),
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
    
    c = models.Captions(
        image_id=image_id,
        title=title,
        prompt=prompt,
        model=model_code,
        schema_id="default_caption@1.0.0",
        raw_json=raw_json,
        generated=text,
        edited=text
    )
    db.add(c)
    print(f"About to commit caption to database...")
    db.commit()
    print(f"Caption commit successful!")
    db.refresh(c)
    print(f"Caption created successfully with ID: {c.cap_id}")
    return c

def get_caption(db: Session, cap_id: str):
    return db.get(models.Captions, cap_id)

def get_captions_by_image(db: Session, image_id: str):
    """Get all captions for a specific image"""
    return db.query(models.Captions).filter(models.Captions.image_id == image_id).all()

def get_all_captions_with_images(db: Session):
    """Get all captions with their associated image data"""
    results = db.query(
        models.Captions,
        models.Images.file_key,
        models.Images.source,
        models.Images.event_type,
        models.Images.epsg,
        models.Images.image_type
    ).join(
        models.Images, models.Captions.image_id == models.Images.image_id
    ).all()
    
    captions_with_images = []
    for caption, file_key, source, event_type, epsg, image_type in results:
        caption_dict = {
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
            "updated_at": caption.updated_at,
            "file_key": file_key,
            "image_url": f"/api/images/{caption.image_id}/file",
            "source": source,
            "event_type": event_type,
            "epsg": epsg,
            "image_type": image_type,
            "countries": []
        }
        captions_with_images.append(caption_dict)
    
    return captions_with_images

def update_caption(db: Session, cap_id: str, update: schemas.CaptionUpdate):
    c = get_caption(db, cap_id)
    if not c:
        return None
    
    for field, value in update.dict(exclude_unset=True).items():
        setattr(c, field, value)
    
    db.commit()
    db.refresh(c)
    return c

def delete_caption(db: Session, cap_id: str):
    """Delete a caption by ID"""
    c = get_caption(db, cap_id)
    if not c:
        return False
    
    db.delete(c)
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
