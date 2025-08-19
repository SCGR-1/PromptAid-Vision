
from pydantic import BaseModel, AnyHttpUrl, Field
from typing import List, Optional

class CreateImageFromUrlIn(BaseModel):
    url: str 
    source: Optional[str] = None
    event_type: str = "OTHER"
    epsg: str = "OTHER"
    image_type: str
    countries: List[str] = Field(default_factory=list)
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

class CreateImageFromUrlOut(BaseModel):
    image_id: str
    image_url: str
