import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


from .config import settings

raw_db_url = settings.DATABASE_URL

if raw_db_url.startswith("psql '") and raw_db_url.endswith("'"):
    raw_db_url = raw_db_url[6:-1]

if "sslmode=" not in raw_db_url and "localhost" not in raw_db_url and "127.0.0.1" not in raw_db_url:
    raw_db_url = f"{raw_db_url}{'&' if '?' in raw_db_url else '?'}sslmode=require"

    print(f"database url: {raw_db_url}")  

engine = create_engine(
    raw_db_url,            
    pool_pre_ping=True,
    pool_recycle=300,        
                  
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()
