from sqlalchemy import (
    Column, String, DateTime, JSON, SmallInteger, Table, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, CHAR
from sqlalchemy.orm import relationship
import datetime, uuid
from .database import Base

# association table maps ↔ countries
map_countries = Table(
    "map_countries", Base.metadata,
    Column("map_id", UUID(as_uuid=True), ForeignKey("maps.map_id", ondelete="CASCADE")),
    Column("c_code", CHAR(2), ForeignKey("country.c_code")),
)

class Source(Base):
    __tablename__ = "sources"
    s_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Region(Base):
    __tablename__ = "region"
    r_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Category(Base):
    __tablename__ = "category"
    cat_code = Column(String, primary_key=True)
    label    = Column(String, nullable=False)

class Country(Base):
    __tablename__ = "country"
    c_code = Column(CHAR(2), primary_key=True)
    label  = Column(String, nullable=False)

class ModelLookup(Base):
    __tablename__ = "model"
    m_code = Column(String, primary_key=True)
    label  = Column(String, nullable=False)

class Map(Base):
    __tablename__ = "maps"
    map_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_key   = Column(String, nullable=False)
    sha256     = Column(String, nullable=False)
    source     = Column(String, ForeignKey("sources.s_code"), nullable=False)
    region     = Column(String, ForeignKey("region.r_code"), nullable=False)
    category   = Column(String, ForeignKey("category.cat_code"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    countries = relationship("Country", secondary=map_countries)
    caption   = relationship("Caption", uselist=False, back_populates="map")

class Caption(Base):
    __tablename__ = "captions"
    cap_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    map_id     = Column(UUID(as_uuid=True), ForeignKey("maps.map_id", ondelete="CASCADE"), unique=True)
    model      = Column(String, ForeignKey("model.m_code"), nullable=False)
    raw_json   = Column(JSON, nullable=False)
    generated  = Column(String, nullable=False)
    edited     = Column(String)
    accuracy   = Column(SmallInteger)
    context    = Column(SmallInteger)
    usability  = Column(SmallInteger)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=datetime.datetime.utcnow)

    map = relationship("Map", back_populates="caption")