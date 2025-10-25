import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


from .config import settings

logger = logging.getLogger(__name__)

raw_db_url = settings.DATABASE_URL

if raw_db_url.startswith("psql '") and raw_db_url.endswith("'"):
    raw_db_url = raw_db_url[6:-1]

# Convert postgresql:// to postgresql+psycopg:// for psycopg v3
if raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
    raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://")

if "sslmode=" not in raw_db_url and "localhost" not in raw_db_url and "127.0.0.1" not in raw_db_url:
    raw_db_url = f"{raw_db_url}{'&' if '?' in raw_db_url else '?'}sslmode=require"

logger.debug(f"database url: {raw_db_url}")  

engine = create_engine(
    raw_db_url,            
    pool_pre_ping=True,
    pool_recycle=300,        
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
