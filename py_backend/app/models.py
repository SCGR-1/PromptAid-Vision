from sqlalchemy import (
    Column, String, DateTime, SmallInteger, Table, ForeignKey, Boolean,
    CheckConstraint, UniqueConstraint, Text, Integer
)
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, CHAR, JSONB
from sqlalchemy.orm import relationship
import datetime, uuid
from .database import Base
from sqlalchemy import Float, Boolean

image_countries = Table(
    "image_countries", Base.metadata,
    Column(
      "image_id",
      UUID(as_uuid=True),
      ForeignKey("images.image_id", ondelete="CASCADE"),
      primary_key=True,
    ),
    Column(
      "c_code",
      CHAR(2),
      ForeignKey("countries.c_code"),
      primary_key=True,
    ),
)

images_captions = Table(
    "images_captions", Base.metadata,
    Column(
      "image_id",
      UUID(as_uuid=True),
      ForeignKey("images.image_id", ondelete="CASCADE"),
      primary_key=True,
    ),
    Column(
      "caption_id",
      UUID(as_uuid=True),
      ForeignKey("captions.caption_id", ondelete="CASCADE"),
      primary_key=True,
    ),
)

class Source(Base):
    __tablename__ = "sources"
    s_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Region(Base):
    __tablename__ = "regions"
    r_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class EventType(Base):
    __tablename__ = "event_types"
    t_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Country(Base):
    __tablename__ = "countries"
    c_code = Column(CHAR(2), primary_key=True)
    label  = Column(String, nullable=False)
    r_code = Column(String, ForeignKey("regions.r_code"), nullable=False)

class SpatialReference(Base):
    __tablename__ = "spatial_references"
    epsg  = Column(String, primary_key=True)
    srid  = Column(String, nullable=False)
    proj4 = Column(String, nullable=False)
    wkt   = Column(String, nullable=False)

class ImageTypes(Base):
    __tablename__ = "image_types"
    image_type = Column(String, primary_key=True)
    label = Column(String, nullable=False)

class Prompts(Base):
    __tablename__ = "prompts"
    p_code = Column(String, primary_key=True)
    label = Column(Text, nullable=False)
    metadata_instructions = Column(Text, nullable=True)
    image_type = Column(String, ForeignKey("image_types.image_type"), nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    
    # Relationship to image_types table
    image_type_r = relationship("ImageTypes")

class Models(Base):
    __tablename__ = "models"
    m_code = Column(String, primary_key=True)
    label = Column(String, nullable=False)
    model_type = Column(String, nullable=False)
    is_available = Column(Boolean, default=True)
    config = Column(JSONB, nullable=True)
    provider = Column(String, nullable=True)
    model_id = Column(String, nullable=True)
    delete_count = Column(SmallInteger, nullable=False, default=0)

class JSONSchema(Base):
    __tablename__ = "json_schemas"
    schema_id = Column(String, primary_key=True)
    title     = Column(String, nullable=False)
    schema    = Column(JSONB, nullable=False)
    version   = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

class Images(Base):
    __tablename__ = "images"
    __table_args__ = (
        CheckConstraint('center_lat IS NULL OR (center_lat BETWEEN -90 AND 90)', name='chk_images_center_lat'),
        CheckConstraint('center_lon IS NULL OR (center_lon BETWEEN -180 AND 180)', name='chk_images_center_lon'),
        CheckConstraint('heading_deg IS NULL OR (heading_deg >= 0 AND heading_deg <= 360)', name='chk_images_heading_deg'),
        CheckConstraint('pitch_deg IS NULL OR (pitch_deg BETWEEN -90 AND 90)', name='chk_images_pitch_deg'),
        CheckConstraint('yaw_deg IS NULL OR (yaw_deg BETWEEN -180 AND 180)', name='chk_images_yaw_deg'),
        CheckConstraint('roll_deg IS NULL OR (roll_deg BETWEEN -180 AND 180)', name='chk_images_roll_deg'),
    )

    image_id    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_key    = Column(String, nullable=False)
    sha256      = Column(String, nullable=False)
    source      = Column(String, ForeignKey("sources.s_code"), nullable=True)
    event_type  = Column(String, ForeignKey("event_types.t_code"), nullable=False)
    epsg        = Column(String, ForeignKey("spatial_references.epsg"), nullable=False)
    image_type  = Column(String, ForeignKey("image_types.image_type"), nullable=False)
    captured_at = Column(TIMESTAMP(timezone=True))

    # Drone-specific fields
    center_lon = Column(Float)   
    center_lat = Column(Float)
    amsl_m     = Column(Float)
    agl_m      = Column(Float)
    heading_deg= Column(Float)
    yaw_deg    = Column(Float)
    pitch_deg  = Column(Float)
    roll_deg   = Column(Float)
    rtk_fix    = Column(Boolean)
    std_h_m    = Column(Float)
    std_v_m    = Column(Float)

    # Relationships
    countries = relationship("Country", secondary=image_countries, backref="images")
    captions = relationship("Captions", secondary=images_captions, backref="images")

class Captions(Base):
    __tablename__ = "captions"
    __table_args__ = (
        CheckConstraint('accuracy IS NULL OR (accuracy BETWEEN 0 AND 100)', name='chk_captions_accuracy'),
        CheckConstraint('context IS NULL OR (context BETWEEN 0 AND 100)', name='chk_captions_context'),
        CheckConstraint('usability IS NULL OR (usability BETWEEN 0 AND 100)', name='chk_captions_usability'),
    )

    caption_id  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title       = Column(String, nullable=True)
    prompt      = Column(String, ForeignKey("prompts.p_code"), nullable=True)
    model       = Column(String, ForeignKey("models.m_code"), nullable=True)
    schema_id   = Column(String, ForeignKey("json_schemas.schema_id"), nullable=True)
    raw_json    = Column(JSONB, nullable=True)
    generated   = Column(Text, nullable=True)
    edited      = Column(Text)
    accuracy    = Column(SmallInteger)
    context     = Column(SmallInteger)
    usability   = Column(SmallInteger)
    starred     = Column(Boolean, default=False)
    image_count = Column(Integer, nullable=True)
    created_at  = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)
    updated_at  = Column(TIMESTAMP(timezone=True), onupdate=datetime.datetime.utcnow)

    # Relationships
    schema = relationship("JSONSchema")
    model_r = relationship("Models", foreign_keys=[model])
    prompt_r = relationship("Prompts", foreign_keys=[prompt])
