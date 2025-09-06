# ---- ensure .env is loaded for alembic too ----
from pathlib import Path
try:
    from dotenv import load_dotenv
    # Use utf-8-sig to strip BOM just in case
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env",
                override=True, encoding="utf-8-sig")
except Exception:
    pass
# -----------------------------------------------

import os
import sys
from dotenv import load_dotenv

# Set environment encoding to handle Windows encoding issues
if sys.platform == "win32":
    import locale
    try:
        # Try to set UTF-8 encoding for environment variables
        os.environ['PYTHONIOENCODING'] = 'utf-8'
    except:
        pass


env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
print(f"Looking for .env file at: {env_path}")
print(f".env file exists: {os.path.exists(env_path)}")

if os.path.exists(env_path):
    load_dotenv(env_path, encoding="utf-8-sig")
    print("SUCCESS: Loaded .env file from py_backend directory")
else:
    print("ERROR: .env file not found in py_backend directory")
    # Try current directory
    load_dotenv(encoding="utf-8-sig")
    print("INFO: Attempted to load .env from current directory")

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
    # Debug: Environment variables loaded
    print("Environment variables loaded")
    
    url = os.getenv("ALEMBIC_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        print("No DATABASE_URL found in environment")
        raise RuntimeError("Set ALEMBIC_DATABASE_URL or DATABASE_URL for Alembic migrations.")

    # Clean the URL to remove any problematic characters (fallback for edge cases)
    try:
        # Test if the URL can be used for connection
        url.encode('utf-8').decode('utf-8')
    except UnicodeError:
        print("WARNING: Encoding issue detected in database URL, attempting to clean...")
        # Replace common problematic characters
        url = url.replace('"', '"').replace('"', '"')  # Smart quotes
        url = url.replace(''', "'").replace(''', "'")  # Smart apostrophes
        url = url.replace('–', '-').replace('—', '-')  # En/em dashes
        # Remove any non-ASCII characters
        url = ''.join(char for char in url if ord(char) < 128)
        print("Cleaned URL: [HIDDEN]")

    print("Alembic database URL: [HIDDEN]")
    
    if url.startswith("psql '") and url.endswith("'"):
        url = url[6:-1]
        print("Cleaned URL: [HIDDEN]")

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
        
        # Add encoding parameters to handle Windows encoding issues
        engine_kwargs = {
            'poolclass': pool.NullPool,
            'future': True,
        }
        
        # For PostgreSQL connections, add encoding parameters
        if url.startswith('postgresql://'):
            engine_kwargs['connect_args'] = {
                'client_encoding': 'utf8',
                'options': '-c client_encoding=utf8'
            }
        
        connectable = create_engine(url, **engine_kwargs)
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
