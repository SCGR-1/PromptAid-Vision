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
    starred: Optional[bool] = None
    
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

class ImageOut(BaseModel):
    image_id: UUID
    file_key: str
    sha256: str
    source: Optional[str] = None
    event_type: str
    epsg: Optional[str] = None
    image_type: str
    image_url: str
    countries: List["CountryOut"] = []
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
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

    class Config:
        from_attributes = True

class CaptionUpdate(BaseModel):
    title: str
    edited: str
    accuracy: Optional[int] = None
    context: Optional[int] = None
    usability: Optional[int] = None

class PromptOut(BaseModel):
    p_code: str
    label: str
    metadata_instructions: str | None = None
    
    class Config:
        from_attributes = True

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
