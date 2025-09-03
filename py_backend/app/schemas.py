from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class ImageCreate(BaseModel):
    source: Optional[str] = None
    event_type: str = "OTHER"
    countries: List[str] = []
    epsg: str = "OTHER"
    image_type: str
    
    # Drone-specific fields (optional)
    center_lon: Optional[float] = None
    center_lat: Optional[float] = None
    amsl_m: Optional[float] = None
    agl_m: Optional[float] = None
    heading_deg: Optional[float] = None
    yaw_deg: Optional[float] = None
    pitch_deg: Optional[float] = None
    roll_deg: Optional[float] = None
    rtk_fix: Optional[bool] = None
    std_h_m: Optional[float] = None
    std_v_m: Optional[float] = None

class ImageMetadataUpdate(BaseModel):
    source: Optional[str] = None
    event_type: Optional[str] = None
    countries: Optional[List[str]] = None
    epsg: Optional[str] = None
    image_type: Optional[str] = None
    starred: Optional[bool] = None  # Backward compatibility - updates first caption
    
    # Drone-specific fields (optional)
    center_lon: Optional[float] = None
    center_lat: Optional[float] = None
    amsl_m: Optional[float] = None
    agl_m: Optional[float] = None
    heading_deg: Optional[float] = None
    yaw_deg: Optional[float] = None
    pitch_deg: Optional[float] = None
    roll_deg: Optional[float] = None
    rtk_fix: Optional[bool] = None
    std_h_m: Optional[float] = None
    std_v_m: Optional[float] = None

class CaptionOut(BaseModel):
    caption_id: UUID
    title: Optional[str] = None
    prompt: Optional[str] = None
    model: Optional[str] = None
    schema_id: Optional[str] = None
    raw_json: Optional[dict] = None
    generated: Optional[str] = None
    edited: Optional[str] = None
    accuracy: Optional[int] = None
    context: Optional[int] = None
    usability: Optional[int] = None
    starred: bool = False
    image_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ImageOut(BaseModel):
    image_id: UUID
    file_key: str
    sha256: str
    thumbnail_key: Optional[str] = None
    thumbnail_sha256: Optional[str] = None
    thumbnail_url: Optional[str] = None  # Generated URL for frontend
    detail_key: Optional[str] = None
    detail_sha256: Optional[str] = None
    detail_url: Optional[str] = None  # Generated URL for frontend
    source: Optional[str] = None
    event_type: str
    epsg: Optional[str] = None
    image_type: str
    image_url: str
    countries: List["CountryOut"] = []
    captions: List[CaptionOut] = []
    starred: bool = False  # Backward compatibility - from first caption
    captured_at: Optional[datetime] = None
    
    # Backward compatibility fields for legacy frontend
    title: Optional[str] = None
    prompt: Optional[str] = None
    model: Optional[str] = None
    schema_id: Optional[str] = None
    raw_json: Optional[dict] = None
    generated: Optional[str] = None
    edited: Optional[str] = None
    accuracy: Optional[int] = None
    context: Optional[int] = None
    usability: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Preprocessing information
    preprocessing_info: Optional[dict] = None
    
    # Drone-specific fields
    center_lon: Optional[float] = None
    center_lat: Optional[float] = None
    amsl_m: Optional[float] = None
    agl_m: Optional[float] = None
    heading_deg: Optional[float] = None
    yaw_deg: Optional[float] = None
    pitch_deg: Optional[float] = None
    roll_deg: Optional[float] = None
    rtk_fix: Optional[bool] = None
    std_h_m: Optional[float] = None
    std_v_m: Optional[float] = None
    
    # Multi-upload fields
    all_image_ids: Optional[List[str]] = None
    image_count: Optional[int] = None

    class Config:
        from_attributes = True

class CaptionUpdate(BaseModel):
    title: str
    edited: str
    accuracy: Optional[int] = None
    context: Optional[int] = None
    usability: Optional[int] = None

class CaptionCreate(BaseModel):
    title: str
    prompt: str
    model: str
    raw_json: dict
    generated: str
    edited: str
    accuracy: Optional[int] = None
    context: Optional[int] = None
    usability: Optional[int] = None
    starred: bool = False

class PromptOut(BaseModel):
    p_code: str
    label: str
    metadata_instructions: str | None = None
    image_type: str
    is_active: bool
    
    class Config:
        from_attributes = True

class PromptCreate(BaseModel):
    p_code: str
    label: str
    metadata_instructions: str | None = None
    image_type: str
    is_active: bool

class PromptUpdate(BaseModel):
    label: str
    metadata_instructions: str | None = None
    image_type: str
    is_active: bool

class SourceOut(BaseModel):
    s_code: str
    label: str

    class Config:
        from_attributes = True

class RegionOut(BaseModel):
    r_code: str
    label: str

    class Config:
        from_attributes = True

class TypeOut(BaseModel):
    t_code: str
    label: str

    class Config:
        from_attributes = True

class SpatialReferenceOut(BaseModel):
    epsg: str
    srid: str
    proj4: str
    wkt: str

    class Config:
        from_attributes = True

class ImageTypeOut(BaseModel):
    image_type: str
    label: str

    class Config:
        from_attributes = True

class CountryOut(BaseModel):
    c_code: str
    label: str
    r_code: str

    class Config:
        from_attributes = True

class ModelToggleRequest(BaseModel):
    is_available: bool

ImageOut.update_forward_refs()
