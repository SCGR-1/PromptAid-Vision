import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

raw_db_url = settings.DATABASE_URL
logging.getLogger().warning(f"Raw DATABASE_URL = {raw_db_url!r}")

clean_db_url = raw_db_url.split("?", 1)[0]
logging.getLogger().warning(f"Using clean URL = {clean_db_url!r}")

engine = create_engine(
    clean_db_url,
    echo=True,
    future=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True
)

Base = declarative_base()
