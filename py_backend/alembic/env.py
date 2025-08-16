import os
import sys
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from alembic import context
from sqlalchemy import create_engine, pool
try:
    from app.models import Base
    target_metadata = Base.metadata
    print("Successfully imported models from app.models")
except ImportError as e:
    print(f"Could not import app.models: {e}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python path: {sys.path}")
    from sqlalchemy import MetaData
    target_metadata = MetaData()
    print("Using fallback metadata - migrations may not work properly")

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

    print(f"Alembic database URL: {url}")
    
    if url.startswith("psql '") and url.endswith("'"):
        url = url[6:-1]
        print(f"Cleaned URL: {url}")

    if "sslmode=" not in url and "localhost" not in url and "127.0.0.1" not in url:
        url = f"{url}{'&' if '?' in url else '?'}sslmode=require"
        print(f"Added sslmode: {url}")
    
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
    try:
        url = _get_db_url()
        print(f"Creating engine with URL: {url}")
        
        connectable = create_engine(url, poolclass=pool.NullPool, future=True)
        print("Engine created successfully")

        with connectable.connect() as connection:
            print("Database connection established")
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
            )
            with context.begin_transaction():
                print("Running migrations...")
                context.run_migrations()
                print("Migrations completed successfully")
    except Exception as e:
        print(f"Migration failed: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
