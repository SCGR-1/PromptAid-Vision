import io, hashlib
import logging
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_, and_, distinct, case
from . import models, schemas
from fastapi import HTTPException

logger = logging.getLogger(__name__)

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

def get_images_paginated(
    db: Session,
    search: Optional[str] = None,
    source: Optional[str] = None,
    event_type: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
    image_type: Optional[str] = None,
    upload_type: Optional[str] = None,
    starred_only: bool = False,
    page: int = 1,
    limit: int = 10,
):
    """Get paginated and filtered images using SQL queries"""
    needs_grouping = upload_type is not None
    needs_caption_join = search is not None or starred_only or needs_grouping
    needs_country_join = region is not None or country is not None
    
    base_query = db.query(models.Images)
    
    if needs_caption_join:
        base_query = base_query.join(models.images_captions).join(models.Captions)
        
        if search:
            search_pattern = f"%{search.lower()}%"
            base_query = base_query.filter(
                or_(
                    func.lower(models.Captions.title).like(search_pattern),
                    func.lower(models.Captions.generated).like(search_pattern),
                    func.lower(models.Captions.edited).like(search_pattern)
                )
            )
        
        if starred_only:
            base_query = base_query.filter(models.Captions.starred == True)
    
    if source:
        base_query = base_query.filter(models.Images.source == source)
    
    if event_type:
        base_query = base_query.filter(models.Images.event_type == event_type)
    
    if image_type:
        base_query = base_query.filter(models.Images.image_type == image_type)
    
    if needs_country_join:
        base_query = base_query.join(models.image_countries).join(models.Country)
        if region:
            base_query = base_query.filter(models.Country.r_code == region)
        if country:
            base_query = base_query.filter(models.Country.c_code == country)
    
    if needs_grouping:
        base_query = base_query.group_by(models.Captions.caption_id)
        
        # Check if any image-level filters are active
        has_image_filters = source is not None or event_type is not None or image_type is not None or needs_country_join
        
        if has_image_filters:
            # When image filters are active, count filtered images only
            effective_count = func.count(distinct(models.Images.image_id))
        else:
            # When no image filters, use cached image_count if available
            effective_count = case(
                (
                    func.max(models.Captions.image_count).isnot(None),
                    case(
                        (func.max(models.Captions.image_count) > 0, func.max(models.Captions.image_count)),
                        else_=func.count(distinct(models.Images.image_id))
                    )
                ),
                else_=func.count(distinct(models.Images.image_id))
            )
        
        if upload_type == 'single':
            base_query = base_query.having(effective_count <= 1)
        elif upload_type == 'multiple':
            base_query = base_query.having(effective_count > 1)
        
        offset = (page - 1) * limit
        # Get caption_ids that match the upload_type filter
        caption_id_rows = base_query.with_entities(
            models.Captions.caption_id,
            func.max(models.Images.captured_at).label('captured_at')
        ).order_by(func.max(models.Images.captured_at).desc()).offset(offset).limit(limit).all()
        matching_caption_ids = [row[0] for row in caption_id_rows]
        
        # Get distinct image_ids from the matching captions, reapplying image-level filters
        image_ids_query = db.query(models.Images.image_id)
        
        if source:
            image_ids_query = image_ids_query.filter(models.Images.source == source)
        
        if event_type:
            image_ids_query = image_ids_query.filter(models.Images.event_type == event_type)
        
        if image_type:
            image_ids_query = image_ids_query.filter(models.Images.image_type == image_type)
        
        if needs_country_join:
            image_ids_query = image_ids_query.join(models.image_countries).join(models.Country)
            if region:
                image_ids_query = image_ids_query.filter(models.Country.r_code == region)
            if country:
                image_ids_query = image_ids_query.filter(models.Country.c_code == country)
        
        # Join with captions and filter by matching caption_ids
        image_ids_query = (
            image_ids_query
            .join(models.images_captions)
            .filter(models.images_captions.c.caption_id.in_(matching_caption_ids))
            .distinct()
        )
        image_ids = [row[0] for row in image_ids_query.all()]
    else:
        offset = (page - 1) * limit
        # For distinct with order_by, we need to include the ordering column in the select
        image_id_rows = base_query.with_entities(
            models.Images.image_id,
            models.Images.captured_at
        ).distinct().order_by(models.Images.captured_at.desc()).offset(offset).limit(limit).all()
        image_ids = [row[0] for row in image_id_rows]
    
    images = (
        db.query(models.Images)
        .filter(models.Images.image_id.in_(image_ids))
        .options(
            joinedload(models.Images.countries),
            joinedload(models.Images.captions).joinedload(models.Captions.images)
        )
        .order_by(models.Images.captured_at.desc())
        .all()
    )
    
    return images

def get_images_count(
    db: Session,
    search: Optional[str] = None,
    source: Optional[str] = None,
    event_type: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
    image_type: Optional[str] = None,
    upload_type: Optional[str] = None,
    starred_only: bool = False,
):
    """Count images matching filters using SQL queries"""
    needs_grouping = upload_type is not None
    needs_caption_join = search is not None or starred_only or needs_grouping
    needs_country_join = region is not None or country is not None
    
    query = db.query(models.Images.image_id).distinct()
    
    if needs_caption_join:
        query = query.join(models.images_captions).join(models.Captions)
        
        if search:
            search_pattern = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(models.Captions.title).like(search_pattern),
                    func.lower(models.Captions.generated).like(search_pattern),
                    func.lower(models.Captions.edited).like(search_pattern)
                )
            )
        
        if starred_only:
            query = query.filter(models.Captions.starred == True)
    
    if source:
        query = query.filter(models.Images.source == source)
    
    if event_type:
        query = query.filter(models.Images.event_type == event_type)
    
    if image_type:
        query = query.filter(models.Images.image_type == image_type)
    
    if needs_country_join:
        query = query.join(models.image_countries).join(models.Country)
        if region:
            query = query.filter(models.Country.r_code == region)
        if country:
            query = query.filter(models.Country.c_code == country)
    
    if needs_grouping:
        # When grouping, query caption_ids instead of image_ids
        caption_query = db.query(models.Captions.caption_id)
        
        if search:
            search_pattern = f"%{search.lower()}%"
            caption_query = caption_query.filter(
                or_(
                    func.lower(models.Captions.title).like(search_pattern),
                    func.lower(models.Captions.generated).like(search_pattern),
                    func.lower(models.Captions.edited).like(search_pattern)
                )
            )
        
        if starred_only:
            caption_query = caption_query.filter(models.Captions.starred == True)
        
        # Join with images to apply image-level filters
        caption_query = caption_query.join(models.images_captions).join(models.Images)
        
        if source:
            caption_query = caption_query.filter(models.Images.source == source)
        
        if event_type:
            caption_query = caption_query.filter(models.Images.event_type == event_type)
        
        if image_type:
            caption_query = caption_query.filter(models.Images.image_type == image_type)
        
        if needs_country_join:
            caption_query = caption_query.join(models.image_countries).join(models.Country)
            if region:
                caption_query = caption_query.filter(models.Country.r_code == region)
            if country:
                caption_query = caption_query.filter(models.Country.c_code == country)
        
        # Group by caption_id and apply having filter
        caption_query = caption_query.group_by(models.Captions.caption_id)
        
        # Check if any image-level filters are active
        has_image_filters = source is not None or event_type is not None or image_type is not None or needs_country_join
        
        if has_image_filters:
            # When image filters are active, count filtered images only
            effective_count = func.count(distinct(models.Images.image_id))
        else:
            # When no image filters, use cached image_count if available
            effective_count = case(
                (
                    func.max(models.Captions.image_count).isnot(None),
                    case(
                        (func.max(models.Captions.image_count) > 0, func.max(models.Captions.image_count)),
                        else_=func.count(distinct(models.Images.image_id))
                    )
                ),
                else_=func.count(distinct(models.Images.image_id))
            )
        
        if upload_type == 'single':
            caption_query = caption_query.having(effective_count <= 1)
        elif upload_type == 'multiple':
            caption_query = caption_query.having(effective_count > 1)
        
        count = caption_query.count()
    else:
        count = query.count()
    
    return count

def create_caption(db: Session, image_id, title, prompt, model_code, raw_json, text, metadata=None, image_count=None):
    logger.debug(f"Creating caption for image_id: {image_id}")
    logger.debug(f"Caption data: title={title}, prompt={prompt}, model={model_code}")
    logger.debug(f"Database session ID: {id(db)}")
    logger.debug(f"Database session is active: {db.is_active}")
    
    if metadata:
        raw_json["extracted_metadata"] = metadata
    
    img = db.get(models.Images, image_id)
    if not img:
        raise HTTPException(404, "Image not found")
    
    # Set schema based on image type
    schema_id = "default_caption@1.0.0"  # default
    if img.image_type == "drone_image":
        schema_id = "drone_caption@1.0.0"
    
    # Handle "manual" model: if it doesn't exist in the database, set model to NULL
    # This can happen if migrations didn't run (e.g., in production with fallback table creation)
    model_value = model_code
    if model_code == "manual":
        manual_model = db.query(models.Models).filter(models.Models.m_code == 'manual').first()
        if not manual_model:
            logger.warning("'manual' model not found in database, setting caption.model to NULL")
            model_value = None
    
    caption = models.Captions(
        title=title,
        prompt=prompt,
        model=model_value,
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
    
    logger.debug(f"About to commit caption to database...")
    db.commit()
    logger.debug(f"Caption commit successful!")
    db.refresh(caption)
    logger.info(f"Caption created successfully for image: {img.image_id}")
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

def get_captions_with_images_filtered(
    db: Session,
    search: Optional[str] = None,
    source: Optional[str] = None,
    event_type: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
    image_type: Optional[str] = None,
    upload_type: Optional[str] = None,
    starred_only: bool = False,
    page: int = 1,
    limit: int = 10,
):
    """Get captions with filtered and paginated results using SQL queries"""
    needs_grouping = upload_type is not None
    needs_image_join = source is not None or event_type is not None or image_type is not None or region is not None or country is not None or upload_type is not None
    
    base_query = db.query(models.Captions)
    
    if search:
        search_pattern = f"%{search.lower()}%"
        base_query = base_query.filter(
            or_(
                func.lower(models.Captions.title).like(search_pattern),
                func.lower(models.Captions.generated).like(search_pattern)
            )
        )
    
    if starred_only:
        base_query = base_query.filter(models.Captions.starred == True)
    
    if needs_image_join:
        base_query = base_query.join(models.images_captions).join(models.Images)
        
        if source:
            base_query = base_query.filter(models.Images.source == source)
        
        if event_type:
            base_query = base_query.filter(models.Images.event_type == event_type)
        
        if image_type:
            base_query = base_query.filter(models.Images.image_type == image_type)
        
        if region or country:
            base_query = base_query.join(models.image_countries).join(models.Country)
            if region:
                base_query = base_query.filter(models.Country.r_code == region)
            if country:
                base_query = base_query.filter(models.Country.c_code == country)
    
    if needs_grouping:
        base_query = base_query.group_by(models.Captions.caption_id)
        effective_count = case(
            (
                func.max(models.Captions.image_count).isnot(None),
                case(
                    (func.max(models.Captions.image_count) > 0, func.max(models.Captions.image_count)),
                    else_=func.count(distinct(models.Images.image_id))
                )
            ),
            else_=func.count(distinct(models.Images.image_id))
        )
        if upload_type == 'single':
            base_query = base_query.having(effective_count <= 1)
        elif upload_type == 'multiple':
            base_query = base_query.having(effective_count > 1)
    
    if needs_grouping:
        total_count = count_captions_with_images_filtered(
            db=db,
            search=search,
            source=source,
            event_type=event_type,
            region=region,
            country=country,
            image_type=image_type,
            upload_type=upload_type,
            starred_only=starred_only
        )
    elif needs_image_join:
        count_query = base_query.with_entities(func.count(distinct(models.Captions.caption_id)))
        total_count = count_query.scalar()
    else:
        count_query = base_query.with_entities(func.count(models.Captions.caption_id))
        total_count = count_query.scalar()
    
    query = base_query.order_by(models.Captions.created_at.desc())
    
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    caption_ids = [row[0] for row in query.with_entities(models.Captions.caption_id).all()]
    
    captions = (
        db.query(models.Captions)
        .filter(models.Captions.caption_id.in_(caption_ids))
        .options(
            selectinload(models.Captions.images).selectinload(models.Images.countries)
        )
        .order_by(models.Captions.created_at.desc())
        .all()
    )
    
    return captions, total_count

def count_captions_with_images_filtered(
    db: Session,
    search: Optional[str] = None,
    source: Optional[str] = None,
    event_type: Optional[str] = None,
    region: Optional[str] = None,
    country: Optional[str] = None,
    image_type: Optional[str] = None,
    upload_type: Optional[str] = None,
    starred_only: bool = False,
):
    """Count captions matching filters using SQL queries"""
    needs_grouping = upload_type is not None
    needs_image_join = source is not None or event_type is not None or image_type is not None or region is not None or country is not None or upload_type is not None
    
    query = db.query(models.Captions.caption_id).distinct()
    
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(models.Captions.title).like(search_pattern),
                func.lower(models.Captions.generated).like(search_pattern)
            )
        )
    
    if starred_only:
        query = query.filter(models.Captions.starred == True)
    
    if needs_image_join:
        query = query.join(models.images_captions).join(models.Images)
        
        if source:
            query = query.filter(models.Images.source == source)
        
        if event_type:
            query = query.filter(models.Images.event_type == event_type)
        
        if image_type:
            query = query.filter(models.Images.image_type == image_type)
        
        if region or country:
            query = query.join(models.image_countries).join(models.Country)
            if region:
                query = query.filter(models.Country.r_code == region)
            if country:
                query = query.filter(models.Country.c_code == country)
    
    if needs_grouping:
        query = query.group_by(models.Captions.caption_id)
        effective_count = case(
            (
                func.max(models.Captions.image_count).isnot(None),
                case(
                    (func.max(models.Captions.image_count) > 0, func.max(models.Captions.image_count)),
                    else_=func.count(distinct(models.Images.image_id))
                )
            ),
            else_=func.count(distinct(models.Images.image_id))
        )
        if upload_type == 'single':
            query = query.having(effective_count <= 1)
        elif upload_type == 'multiple':
            query = query.having(effective_count > 1)
    
    count = query.count()
    return count

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

def get_schemas_by_image_type(db: Session, image_type: str):
    """Get all JSON schemas for a specific image type"""
    return db.query(models.JSONSchema).filter(models.JSONSchema.image_type == image_type).all()

def get_recent_images_with_validation(db: Session, limit: int = 100):
    """Get recent images with validation info"""
    return db.query(models.Images).order_by(models.Images.captured_at.desc()).limit(limit).all()

# Fallback model CRUD operations
def get_fallback_model(db: Session) -> Optional[str]:
    """Get the configured fallback model"""
    fallback_model = db.query(models.Models).filter(models.Models.is_fallback == True).first()
    return fallback_model.m_code if fallback_model else None

def set_fallback_model(db: Session, model_code: str):
    """Set the fallback model - ensures only one model can be fallback"""
    # First, clear any existing fallback
    db.query(models.Models).filter(models.Models.is_fallback == True).update({"is_fallback": False})
    
    # Set the new fallback model
    model = db.query(models.Models).filter(models.Models.m_code == model_code).first()
    if model:
        model.is_fallback = True
        db.commit()
        db.refresh(model)
        return model
    return None