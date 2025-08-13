import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

raw_db_url = settings.DATABASE_URL
clean_db_url = raw_db_url.split("?", 1)[0]
print(f"database: {clean_db_url.split('@')[-1].split('/')[-1]}")

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
