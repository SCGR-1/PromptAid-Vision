import os
import sys
from dotenv import load_dotenv

# Load local .env when running migrations locally
load_dotenv()

# Allow "from app import ..." imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from alembic import context
from sqlalchemy import create_engine, pool
from app.models import Base

config = context.config
target_metadata = Base.metadata


def _get_db_url() -> str:
    """
    Prefer a dedicated migration URL; otherwise use the app URL.
    Only adds sslmode=require for remote connections (not localhost).
    """
    url = os.getenv("ALEMBIC_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Set ALEMBIC_DATABASE_URL or DATABASE_URL for Alembic migrations.")

    # Only add sslmode=require for remote connections, not localhost
    if "sslmode=" not in url and "localhost" not in url and "127.0.0.1" not in url:
        url = f"{url}{'&' if '?' in url else '?'}sslmode=require"
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
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
    """Run migrations in 'online' mode."""
    url = _get_db_url()
    connectable = create_engine(url, poolclass=pool.NullPool, future=True)

    with connectable.connect() as connection:
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
