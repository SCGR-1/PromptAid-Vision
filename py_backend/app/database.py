import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url
# from sqlalchemy.pool import NullPool  # optional for serverless

from .config import settings

raw_db_url = settings.DATABASE_URL

# Only add sslmode=require for remote connections, not localhost
if "sslmode=" not in raw_db_url and "localhost" not in raw_db_url and "127.0.0.1" not in raw_db_url:
    raw_db_url = f"{raw_db_url}{'&' if '?' in raw_db_url else '?'}sslmode=require"

# Safely display database URL for logging
try:
    safe_url = make_url(raw_db_url).set(password="***")
    print(f"database url: {safe_url}")
except Exception as e:
    print(f"database url: {raw_db_url}")
    print(f"Warning: Could not parse URL for display: {e}")  

engine = create_engine(
    raw_db_url,            
    pool_pre_ping=True,
    pool_recycle=300,        
    # poolclass=NullPool,     
    # echo=True,              
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()
