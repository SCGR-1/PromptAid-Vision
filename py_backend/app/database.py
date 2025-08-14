import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
# from sqlalchemy.pool import NullPool  # optional for serverless

from .config import settings

raw_db_url = settings.DATABASE_URL

# Clean the URL if it starts with 'psql ' (common in some environments)
if raw_db_url.startswith("psql '") and raw_db_url.endswith("'"):
    raw_db_url = raw_db_url[6:-1]  # Remove "psql '" prefix and "'" suffix

# Only add sslmode=require for remote connections, not localhost
if "sslmode=" not in raw_db_url and "localhost" not in raw_db_url and "127.0.0.1" not in raw_db_url:
    raw_db_url = f"{raw_db_url}{'&' if '?' in raw_db_url else '?'}sslmode=require"

# Simple logging without URL parsing
print(f"database url: {raw_db_url}")  

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
