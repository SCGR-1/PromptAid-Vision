from sqlalchemy import (
    Column, String, DateTime, JSON, SmallInteger, Table, ForeignKey, Boolean
)
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, CHAR
from sqlalchemy.orm import relationship
import datetime, uuid
from .database import Base

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

class Source(Base):
    __tablename__ = "sources"
    s_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Region(Base):
    __tablename__ = "regions"
    r_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Type(Base):
    __tablename__ = "types"
    t_code = Column(String, primary_key=True)
    label    = Column(String, nullable=False)

class Country(Base):
    __tablename__ = "countries"
    c_code = Column(CHAR(2), primary_key=True)
    label  = Column(String, nullable=False)
    r_code = Column(String, ForeignKey("regions.r_code"), nullable=False)

class SpatialReference(Base):
    __tablename__ = "spatial_references"
    epsg = Column(String, primary_key=True)
    srid = Column(String, nullable=False)
    proj4 = Column(String, nullable=False)
    wkt = Column(String, nullable=False)

class ImageTypes(Base):
    __tablename__ = "image_types"
    image_type = Column(String, primary_key=True)
    label = Column(String, nullable=False)

class Models(Base):
    __tablename__ = "models"
    m_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Images(Base):
    __tablename__ = "images"
    image_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_key   = Column(String, nullable=False)
    sha256     = Column(String, nullable=False)
    source     = Column(String, ForeignKey("sources.s_code"), nullable=False)
    type   = Column(String, ForeignKey("types.t_code"), nullable=False)
    epsg = Column(String, ForeignKey("spatial_references.epsg"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)
    image_type = Column(String, ForeignKey("image_types.image_type"), nullable=False)

    countries = relationship("Country", secondary=image_countries, backref="images")
    caption   = relationship("Captions", uselist=False, back_populates="image")

class Captions(Base):
    __tablename__ = "captions"
    cap_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id     = Column(UUID(as_uuid=True), ForeignKey("images.image_id", ondelete="CASCADE"), unique=True)
    title      = Column(String, nullable=False)
    prompt     = Column(String, nullable=False)
    model      = Column(String, ForeignKey("models.m_code"), nullable=False)
    raw_json   = Column(JSON, nullable=False)
    generated  = Column(String, nullable=False)
    edited     = Column(String)
    accuracy   = Column(SmallInteger)
    context    = Column(SmallInteger)
    usability  = Column(SmallInteger)
    starred    = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=datetime.datetime.utcnow)

    image = relationship("Images", back_populates="caption")