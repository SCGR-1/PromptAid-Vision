import io, hashlib
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from fastapi import HTTPException

def hash_bytes(data: bytes) -> str:
    """Compute SHA-256 hex digest of the data."""
    return hashlib.sha256(data).hexdigest()

def create_image(db: Session, src, type_code, key, sha, countries: list[str], epsg: Optional[str], image_type: str, 
                center_lon: Optional[float] = None, center_lat: Optional[float] = None, 
                amsl_m: Optional[float] = None, agl_m: Optional[float] = None,
                heading_deg: Optional[float] = None, yaw_deg: Optional[float] = None,
                pitch_deg: Optional[float] = None, roll_deg: Optional[float] = None,
                rtk_fix: Optional[bool] = None, std_h_m: Optional[float] = None, std_v_m: Optional[float] = None,
                thumbnail_key: Optional[str] = None, thumbnail_sha256: Optional[str] = None,
                detail_key: Optional[str] = None, detail_sha256: Optional[str] = None):
    """Insert into images and image_countries."""
    
    if image_type == "drone_image":
        if type_code is None:
            type_code = "OTHER"
        if epsg is None:
            epsg = "OTHER"
    else:
        if src is None:
            src = "OTHER"
        if type_code is None:
            type_code = "OTHER"
        if epsg is None:
            epsg = "OTHER"
    
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
    
    img = models.Images(
        source=src, event_type=type_code,
        file_key=key, sha256=sha, thumbnail_key=thumbnail_key, thumbnail_sha256=thumbnail_sha256,
        detail_key=detail_key, detail_sha256=detail_sha256, epsg=epsg, image_type=image_type,
        center_lon=center_lon, center_lat=center_lat, amsl_m=amsl_m, agl_m=agl_m,
        heading_deg=heading_deg, yaw_deg=yaw_deg, pitch_deg=pitch_deg, roll_deg=roll_deg,
        rtk_fix=rtk_fix, std_h_m=std_h_m, std_v_m=std_v_m
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
    """Get all images with their countries and captions"""
    return (
        db.query(models.Images)
        .options(
            joinedload(models.Images.countries),
            joinedload(models.Images.captions).joinedload(models.Captions.images),
        )
        .all()
    )

def get_image(db: Session, image_id: str):
    """Get a single image by ID with its countries and captions"""
    return (
        db.query(models.Images)
        .options(
            joinedload(models.Images.countries),
            joinedload(models.Images.captions).joinedload(models.Captions.images),
        )
        .filter(models.Images.image_id == image_id)
        .first()
    )

def create_caption(db: Session, image_id, title, prompt, model_code, raw_json, text, metadata=None, image_count=None):
    print(f"Creating caption for image_id: {image_id}")
    print(f"Caption data: title={title}, prompt={prompt}, model={model_code}")
    print(f"Database session ID: {id(db)}")
    print(f"Database session is active: {db.is_active}")
    
    if metadata:
        raw_json["extracted_metadata"] = metadata
    
    img = db.get(models.Images, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    # Set schema based on image type
    schema_id = "default_caption@1.0.0"  # default
    if img.image_type == "drone_image":
        schema_id = "drone_caption@1.0.0"
    
    caption = models.Captions(
        title=title,
        prompt=prompt,
        model=model_code,
        schema_id=schema_id,
        raw_json=raw_json,
        generated=text,
        edited=text,
        image_count=image_count
    )
    
    db.add(caption)
    db.flush()
    
    # Link caption to image
    img.captions.append(caption)
    
    print(f"About to commit caption to database...")
    db.commit()
    print(f"Caption commit successful!")
    db.refresh(caption)
    print(f"Caption created successfully for image: {img.image_id}")
    return caption

def get_caption(db: Session, caption_id: str):
    """Get caption data for a specific caption ID"""
    return db.get(models.Captions, caption_id)

def get_captions_by_image(db: Session, image_id: str):
    """Get all captions for a specific image"""
    img = db.get(models.Images, image_id)
    if img:
        return img.captions
    return []

def get_all_captions_with_images(db: Session):
    """Get all captions with their associated images"""
    return (
        db.query(models.Captions)
        .options(
            joinedload(models.Captions.images).joinedload(models.Images.countries),
        )
        .all()
    )

def get_prompts(db: Session):
    """Get all available prompts"""
    return db.query(models.Prompts).all()

def get_prompt(db: Session, p_code: str):
    """Get a specific prompt by code"""
    return db.query(models.Prompts).filter(models.Prompts.p_code == p_code).first()

def get_prompt_by_label(db: Session, label: str):
    """Get a specific prompt by label text"""
    return db.query(models.Prompts).filter(models.Prompts.label == label).first()

def get_active_prompt_by_image_type(db: Session, image_type: str):
    """Get the active prompt for a specific image type"""
    return db.query(models.Prompts).filter(
        models.Prompts.image_type == image_type,
        models.Prompts.is_active == True
    ).first()

def toggle_prompt_active_status(db: Session, p_code: str, image_type: str):
    """Toggle the active status of a prompt for a specific image type"""
    # Validate that the image_type exists
    image_type_obj = db.query(models.ImageTypes).filter(models.ImageTypes.image_type == image_type).first()
    if not image_type_obj:
        raise ValueError(f"Invalid image_type: {image_type}")
    
    # Get the prompt to toggle
    prompt = db.query(models.Prompts).filter(models.Prompts.p_code == p_code).first()
    if not prompt:
        return None
    
    # If the prompt is already active, deactivate it
    if prompt.is_active:
        prompt.is_active = False
        db.commit()
        db.refresh(prompt)
        return prompt
    
    # If the prompt is not active, first deactivate the currently active prompt
    # then activate this one
    current_active = db.query(models.Prompts).filter(
        models.Prompts.image_type == image_type,
        models.Prompts.is_active == True
    ).first()
    
    if current_active:
        current_active.is_active = False
        # Commit the deactivation first to avoid constraint violation
        db.commit()
    
    prompt.is_active = True
    db.commit()
    db.refresh(prompt)
    return prompt

def create_prompt(db: Session, prompt_data: schemas.PromptCreate):
    """Create a new prompt"""
    # Validate that the image_type exists
    image_type_obj = db.query(models.ImageTypes).filter(models.ImageTypes.image_type == prompt_data.image_type).first()
    if not image_type_obj:
        raise ValueError(f"Invalid image_type: {prompt_data.image_type}")
    
    # Check if prompt code already exists
    existing_prompt = db.query(models.Prompts).filter(models.Prompts.p_code == prompt_data.p_code).first()
    if existing_prompt:
        raise ValueError(f"Prompt with code '{prompt_data.p_code}' already exists")
    
    # If this prompt is set as active, deactivate the currently active prompt for this image type
    if prompt_data.is_active:
        current_active = db.query(models.Prompts).filter(
            models.Prompts.image_type == prompt_data.image_type,
            models.Prompts.is_active == True
        ).first()
        
        if current_active:
            current_active.is_active = False
            # Commit the deactivation first to avoid constraint violation
            db.commit()
    
    # Create the new prompt
    new_prompt = models.Prompts(
        p_code=prompt_data.p_code,
        label=prompt_data.label,
        metadata_instructions=prompt_data.metadata_instructions,
        image_type=prompt_data.image_type,
        is_active=prompt_data.is_active
    )
    
    db.add(new_prompt)
    db.commit()
    db.refresh(new_prompt)
    return new_prompt

def update_prompt(db: Session, p_code: str, prompt_update: schemas.PromptUpdate):
    """Update a specific prompt by code"""
    prompt = db.query(models.Prompts).filter(models.Prompts.p_code == p_code).first()
    if not prompt:
        return None
    
    # Handle is_active field specially to maintain unique constraint
    update_data = prompt_update.dict(exclude_unset=True)
    
    # If we're setting this prompt as active, deactivate other prompts for this image type
    if 'is_active' in update_data and update_data['is_active']:
        current_active = db.query(models.Prompts).filter(
            models.Prompts.image_type == prompt.image_type,
            models.Prompts.is_active == True,
            models.Prompts.p_code != p_code  # Exclude current prompt
        ).first()
        
        if current_active:
            current_active.is_active = False
            # Commit the deactivation first to avoid constraint violation
            db.commit()
    
    # Update all fields
    for field, value in update_data.items():
        setattr(prompt, field, value)
    
    db.commit()
    db.refresh(prompt)
    return prompt

def update_caption(db: Session, caption_id: str, update: schemas.CaptionUpdate):
    """Update caption data for a caption"""
    caption = db.get(models.Captions, caption_id)
    if not caption:
        return None
    
    for field, value in update.dict(exclude_unset=True).items():
        setattr(caption, field, value)
    
    db.commit()
    db.refresh(caption)
    return caption

def delete_caption(db: Session, caption_id: str):
    """Delete caption data for a caption"""
    caption = db.get(models.Captions, caption_id)
    if not caption:
        return False
    
    db.delete(caption)
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

def create_model(db: Session, m_code: str, label: str, model_type: str, provider: str, model_id: str, is_available: bool = False):
    """Create a new model"""
    new_model = models.Models(
        m_code=m_code,
        label=label,
        model_type=model_type,
        provider=provider,
        model_id=model_id,
        is_available=is_available
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

def update_model(db: Session, m_code: str, update_data: dict):
    """Update an existing model"""
    model = db.get(models.Models, m_code)
    if not model:
        return None
    
    for field, value in update_data.items():
        if hasattr(model, field):
            setattr(model, field, value)
    
    db.commit()
    db.refresh(model)
    return model

def delete_model(db: Session, m_code: str):
    """Hard delete a model by removing it from the database"""
    model = db.get(models.Models, m_code)
    if not model:
        return False
    
    # Remove the model from the database
    db.delete(model)
    db.commit()
    return True

def get_all_schemas(db: Session):
    """Get all JSON schemas"""
    return db.query(models.JSONSchema).all()

def get_schema(db: Session, schema_id: str):
    """Get a specific JSON schema by ID"""
    return db.query(models.JSONSchema).filter(models.JSONSchema.schema_id == schema_id).first()

def get_recent_images_with_validation(db: Session, limit: int = 100):
    """Get recent images with validation info"""
    return db.query(models.Images).order_by(models.Images.captured_at.desc()).limit(limit).all()
