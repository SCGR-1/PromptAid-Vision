# app/database.py

import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

# 1) Grab the raw DATABASE_URL (e.g. "postgresql://...:5433/promptaid?schema=public")
raw_db_url = settings.DATABASE_URL
logging.getLogger().warning(f"▶️ Raw DATABASE_URL = {raw_db_url!r}")

# 2) Strip off any query string (everything from the first "?" onward)
clean_db_url = raw_db_url.split("?", 1)[0]
logging.getLogger().warning(f"▶️ Using clean   URL = {clean_db_url!r}")

# 3) Create the SQLAlchemy engine on that clean URL
engine = create_engine(
    clean_db_url,
    echo=True,            # log all SQL to the console
    future=True           # recommended for SQLAlchemy 2.0 style
)

# 4) Configure a session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True
)

# 5) Base class for all ORM models
Base = declarative_base()
