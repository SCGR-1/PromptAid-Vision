from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

#–– For the UploadPage ––
class MapCreate(BaseModel):
    source: str
    region: str
    category: str
    countries: List[str] = []

class MapOut(BaseModel):
    map_id: UUID
    file_key: str
    sha256: str
    source: str
    region: str
    category: str

    class Config:
        orm_mode = True

#–– For the caption endpoints ––
class CaptionOut(BaseModel):
    cap_id: UUID
    map_id: UUID
    model: str
    raw_json: dict
    generated: str
    edited: Optional[str]
    accuracy: Optional[int]
    context: Optional[int]
    usability: Optional[int]

    class Config:
        orm_mode = True

class CaptionUpdate(BaseModel):
    edited: str
    accuracy: int = Field(..., ge=0, le=100)
    context:  int = Field(..., ge=0, le=100)
    usability:int = Field(..., ge=0, le=100)
