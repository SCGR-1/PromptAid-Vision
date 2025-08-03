import io, hashlib
from sqlalchemy.orm import Session, joinedload
from . import models

def hash_bytes(data: bytes) -> str:
    """Compute SHA‑256 hex digest of the data."""
    return hashlib.sha256(data).hexdigest()

def create_image(db: Session, src, type_code, key, sha, countries: list[str], epsg: str, image_type: str):
    """Insert into images and image_countries."""
    print(f"Creating image record: source={src}, type={type_code}, key={key}, epsg={epsg}, image_type={image_type}")
    print(f"Database session ID: {id(db)}")
    print(f"Database session is active: {db.is_active}")
    
    img = models.Images(
        source=src, type=type_code,
        file_key=key, sha256=sha, epsg=epsg, image_type=image_type
    )
    db.add(img)
    db.flush()  # assign img.image_id
    print(f"Image record created with ID: {img.image_id}")

    # link countries
    for c in countries:
        country = db.get(models.Country, c)
        if country:
            img.countries.append(country)
            print(f"Linked country: {c}")
        else:
            print(f"Warning: Country {c} not found in database")

    print(f"About to commit to database...")
    db.commit()
    print(f"Commit successful!")
    db.refresh(img)
    print(f"Image record committed to database successfully")
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
    print(f"Creating caption for image_id: {image_id}")
    print(f"Caption data: title={title}, prompt={prompt}, model={model_code}")
    print(f"Database session ID: {id(db)}")
    print(f"Database session is active: {db.is_active}")
    
    c = models.Captions(
        image_id=image_id,
        title=title,
        prompt=prompt,
        model=model_code,
        raw_json=raw_json,
        generated=text,
        edited=text  # Always set edited to generated initially
    )
    db.add(c)
    print(f"About to commit caption to database...")
    db.commit()
    print(f"Caption commit successful!")
    db.refresh(c)
    print(f"Caption created successfully with ID: {c.cap_id}")
    return c

def get_caption(db: Session, cap_id):
    return db.get(models.Captions, cap_id)

def update_caption(db: Session, cap_id, edited=None, accuracy=None, context=None, usability=None, starred=None):
    c = get_caption(db, cap_id)
    if not c:
        return None
    
    # Always save an edited version - use provided edited text or fall back to generated
    if edited is not None:
        c.edited = edited
    elif c.edited is None:
        # If no edited version exists, save the generated as edited
        c.edited = c.generated
    
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

def get_countries(db: Session):
    """Get all countries for lookup"""
    return db.query(models.Country).all()

def get_country(db: Session, c_code: str):
    """Get a single country by code"""
    return db.get(models.Country, c_code)
