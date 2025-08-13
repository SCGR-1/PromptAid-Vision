# backend/app/schemas/images.py
from pydantic import BaseModel, AnyHttpUrl, Field
from typing import List, Optional

class CreateImageFromUrlIn(BaseModel):
    url: str 
    source: str
    event_type: str
    epsg: str
    image_type: str
    countries: List[str] = Field(default_factory=list)

class CreateImageFromUrlOut(BaseModel):
    image_id: str
    image_url: str
