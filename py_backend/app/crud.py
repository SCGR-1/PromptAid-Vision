import io, hashlib
from sqlalchemy.orm import Session, joinedload
from . import models

def hash_bytes(data: bytes) -> str:
    """Compute SHA‑256 hex digest of the data."""
    return hashlib.sha256(data).hexdigest()

def create_image(db: Session, src, type_code, key, sha, countries: list[str], epsg: str, image_type: str):
    """Insert into images and image_countries."""
    img = models.Images(
        source=src, type=type_code,
        file_key=key, sha256=sha, epsg=epsg, image_type=image_type
    )
    db.add(img)
    db.flush()  # assign img.image_id

    # link countries
    for c in countries:
        country = db.get(models.Country, c)
        if country:
            img.countries.append(country)

    db.commit()
    db.refresh(img)
    return img

def get_images(db: Session):
    """Get all images with their captions"""
    return db.query(models.Images).options(
        joinedload(models.Images.caption)
    ).all()

def get_image(db: Session, image_id: str):
    """Get a single image by ID with its caption"""
    return db.query(models.Images).options(
        joinedload(models.Images.caption)
    ).filter(models.Images.image_id == image_id).first()

def create_caption(db: Session, image_id, title, prompt, model_code, raw_json, text):
    c = models.Captions(
        image_id=image_id,
        title=title,
        prompt=prompt,
        model=model_code,
        raw_json=raw_json,
        generated=text
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

def get_caption(db: Session, cap_id):
    return db.get(models.Captions, cap_id)

def update_caption(db: Session, cap_id, edited=None, accuracy=None, context=None, usability=None, starred=None):
    c = get_caption(db, cap_id)
    if not c:
        return None
    
    if edited is not None:
        c.edited = edited
    if accuracy is not None:
        c.accuracy = accuracy
    if context is not None:
        c.context = context
    if usability is not None:
        c.usability = usability
    if starred is not None:
        c.starred = starred
    
    db.commit()
    db.refresh(c)
    return c

def get_sources(db: Session):
    """Get all sources for lookup"""
    return db.query(models.Source).all()

def get_regions(db: Session):
    """Get all regions for lookup"""
    return db.query(models.Region).all()

def get_types(db: Session):
    """Get all types for lookup"""
    return db.query(models.Type).all()

def get_spatial_references(db: Session):
    """Get all spatial references for lookup"""
    return db.query(models.SpatialReference).all()

def get_image_types(db: Session):
    """Get all image types for lookup"""
    return db.query(models.ImageTypes).all()
