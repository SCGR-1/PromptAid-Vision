from pathlib import Path
import os
import sys

ROOT = Path(__file__).resolve().parents[1]
DOTENV = ROOT / ".env"

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=DOTENV, override=True, encoding="utf-8-sig")
except Exception:
    pass

sys.path.insert(0, str(ROOT))

from alembic import context
from sqlalchemy import create_engine, pool, MetaData

try:
    from app.models import Base
    target_metadata = Base.metadata
except Exception:
    target_metadata = MetaData()

config = context.config

def _get_db_url() -> str:
    url = os.getenv("ALEMBIC_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Set ALEMBIC_DATABASE_URL or DATABASE_URL for Alembic migrations.")
    # Replace postgresql:// with postgresql+psycopg:// for psycopg3
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url

def run_migrations_offline() -> None:
    url = _get_db_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    url = _get_db_url()
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()