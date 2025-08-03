from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class ImageCreate(BaseModel):
    source: str
    type: str
    countries: List[str] = []
    epsg: str
    image_type: str

class ImageMetadataUpdate(BaseModel):
    source: Optional[str] = None
    type: Optional[str] = None
    countries: Optional[List[str]] = None
    epsg: Optional[str] = None
    image_type: Optional[str] = None

class ImageOut(BaseModel):
    image_id: UUID
    file_key: str
    sha256: str
    source: str
    type: str
    epsg: str
    image_type: str
    image_url: str
    countries: List["CountryOut"] = []
    caption: Optional["CaptionOut"] = None

    class Config:
        orm_mode = True

#–– For the caption endpoints ––
class CaptionOut(BaseModel):
    cap_id: UUID
    image_id: UUID
    title: str
    prompt: str
    model: str
    raw_json: dict
    generated: str
    edited: Optional[str] = None
    accuracy: Optional[int] = None
    context: Optional[int] = None
    usability: Optional[int] = None
    starred: bool = False

    class Config:
        orm_mode = True

class CaptionUpdate(BaseModel):
    edited: Optional[str] = None
    accuracy: Optional[int] = None
    context: Optional[int] = None
    usability: Optional[int] = None
    starred: Optional[bool] = None

#–– For lookup data ––
class SourceOut(BaseModel):
    s_code: str
    label: str

    class Config:
        orm_mode = True

class RegionOut(BaseModel):
    r_code: str
    label: str

    class Config:
        orm_mode = True

class TypeOut(BaseModel):
    t_code: str
    label: str

    class Config:
        orm_mode = True

class SpatialReferenceOut(BaseModel):
    epsg: str
    srid: str
    proj4: str
    wkt: str

    class Config:
        orm_mode = True

class ImageTypeOut(BaseModel):
    image_type: str
    label: str

    class Config:
        orm_mode = True

class CountryOut(BaseModel):
    c_code: str
    label: str
    r_code: str

    class Config:
        orm_mode = True

# Update forward references
ImageOut.update_forward_refs()
