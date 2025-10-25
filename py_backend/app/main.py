import os
import subprocess
import logging
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, ORJSONResponse
from fastapi.staticfiles import StaticFiles

from dotenv import load_dotenv
load_dotenv()

from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

from app.routers import upload, caption, metadata, models
from app.routers.images import router as images_router
from app.routers.prompts import router as prompts_router
from app.routers.admin import router as admin_router
from app.routers.schemas import router as schemas_router

app = FastAPI(
    title="PromptAid Vision",
    default_response_class=ORJSONResponse,
)

# --------------------------------------------------------------------
# Compression
# --------------------------------------------------------------------
app.add_middleware(GZipMiddleware, minimum_size=500)

# --------------------------------------------------------------------
# Logging middleware (simple)
# --------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.debug(f"{request.method} {request.url.path} -> {response.status_code}")
    return response

# --------------------------------------------------------------------
# Cache headers (assets long-cache, HTML no-cache, API no-store)
# --------------------------------------------------------------------
@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    p = request.url.path

    if p.startswith("/assets/") or p.startswith("/images/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        response.headers["Vary"] = "Accept-Encoding"
    elif p in ("/sw.js", "/manifest.webmanifest", "/vite.svg"):
        if p == "/sw.js":
            response.headers["Cache-Control"] = "no-cache"
        else:
            response.headers["Cache-Control"] = "public, max-age=3600"
        response.headers["Vary"] = "Accept-Encoding"
    elif p == "/" or p.endswith(".html"):
        response.headers["Cache-Control"] = "no-cache"
    elif p.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# --------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"https://.*\.hf\.space$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------
# API Routers
# --------------------------------------------------------------------
app.include_router(caption.router,     prefix="/api",            tags=["captions"])
app.include_router(metadata.router,    prefix="/api",            tags=["metadata"])
app.include_router(models.router,      prefix="/api",            tags=["models"])
app.include_router(upload.router,      prefix="/api/images",     tags=["images"])
app.include_router(images_router,      prefix="/api/contribute", tags=["contribute"])
app.include_router(prompts_router,     prefix="/api/prompts",    tags=["prompts"])
app.include_router(admin_router,       prefix="/api/admin",      tags=["admin"])
app.include_router(schemas_router,     prefix="/api",            tags=["schemas"])

# Handle /api/images and /api/prompts without trailing slash (avoid 307)
@app.get("/api/images", include_in_schema=False)
async def list_images_no_slash():
    from app.routers.upload import list_images
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        return list_images(db)
    finally:
        db.close()

@app.get("/api/prompts", include_in_schema=False)
async def list_prompts_no_slash():
    from app.routers.prompts import get_prompts
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        return get_prompts(db)
    finally:
        db.close()

@app.post("/api/prompts", include_in_schema=False)
async def create_prompt_no_slash(prompt_data: dict):
    from app.routers.prompts import create_prompt
    from app.database import SessionLocal
    from app.schemas import PromptCreate
    db = SessionLocal()
    try:
        prompt_create = PromptCreate(**prompt_data)
        return create_prompt(prompt_create, db)
    finally:
        db.close()

# --------------------------------------------------------------------
# Health / Performance
# --------------------------------------------------------------------
@app.get("/health", include_in_schema=False, response_class=JSONResponse)
async def health():
    return {"status": "ok"}

@app.get("/performance", include_in_schema=False, response_class=ORJSONResponse)
async def performance():
    import psutil, time
    return {
        "timestamp": time.time(),
        "memory_usage": psutil.virtual_memory().percent,
        "cpu_usage": psutil.cpu_percent(),
        "compression_enabled": True,
        "orjson_enabled": True,
        "cache_headers": True,
    }

# --------------------------------------------------------------------
# Static dir resolution (ALWAYS a Path)
# --------------------------------------------------------------------
APP_DIR = Path(__file__).resolve().parent
CANDIDATES = [
    APP_DIR / "static",               # py_backend/static
    APP_DIR.parent / "static",        # ../static
    Path("/app") / "static",          # container path
    Path("/app/app") / "static",      # some containers use /app/app
]
STATIC_DIR = next((p for p in CANDIDATES if p.is_dir()), APP_DIR / "static")
logger.info(f"Serving static files from: {STATIC_DIR}")

# --------------------------------------------------------------------
# Explicit top-level static files
# --------------------------------------------------------------------
@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(
        STATIC_DIR / "manifest.webmanifest",
        media_type="application/manifest+json",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )

@app.get("/sw.js")
def sw():
    return FileResponse(STATIC_DIR / "sw.js", headers={"Cache-Control": "no-cache"})

@app.get("/vite.svg")
def vite_svg():
    svg = STATIC_DIR / "vite.svg"
    if svg.is_file():
        return FileResponse(svg)
    raise HTTPException(status_code=404, detail="Icon not found")

# --------------------------------------------------------------------
# Mount hashed assets at /assets
# --------------------------------------------------------------------
if (STATIC_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

# Serve index at /
@app.get("/")
def index():
    index_html = STATIC_DIR / "index.html"
    if index_html.is_file():
        return FileResponse(index_html, media_type="text/html", headers={"Cache-Control": "no-cache"})
    raise HTTPException(status_code=404, detail="App not found")

# --------------------------------------------------------------------
# Uploads (local storage only)
# --------------------------------------------------------------------
@app.get("/uploads/{file_path:path}")
async def serve_upload(file_path: str):
    """Serve uploaded files from local storage"""
    if settings.STORAGE_PROVIDER != "local":
        raise HTTPException(status_code=404, detail="Local storage not enabled")
    file_path_full = os.path.join(settings.STORAGE_DIR, file_path)
    if not os.path.exists(file_path_full):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path_full)

# --------------------------------------------------------------------
# Debug endpoints
# --------------------------------------------------------------------
@app.get("/debug-routes", include_in_schema=False)
async def debug_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "path"):
            routes.append({
                "path": route.path,
                "name": getattr(route, "name", "N/A"),
                "methods": list(route.methods) if hasattr(route, "methods") else [],
            })
    return {"routes": routes}

@app.get("/debug", include_in_schema=False)
async def debug():
    return {
        "message": "Backend is working",
        "timestamp": datetime.now().isoformat(),
        "routes": [route.path for route in app.routes],
    }

@app.get("/debug-static", include_in_schema=False)
async def debug_static():
    return {
        "static_dir": str(STATIC_DIR),
        "exists": STATIC_DIR.exists(),
        "is_dir": STATIC_DIR.is_dir(),
        "current_dir": os.getcwd(),
        "app_dir": str(APP_DIR),
        "parent_dir": str(APP_DIR.parent),
        "sw_exists": (STATIC_DIR / "sw.js").exists(),
        "sw_path": str(STATIC_DIR / "sw.js"),
        "static_files": [p.name for p in STATIC_DIR.iterdir()] if STATIC_DIR.exists() else [],
    }

@app.get("/test-sw", include_in_schema=False)
def test_service_worker():
    sw_path = STATIC_DIR / "sw.js"
    if sw_path.is_file():
        return FileResponse(sw_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="Service Worker not found")

# --------------------------------------------------------------------
# SPA fallback LAST (doesn't swallow API/debug)
# --------------------------------------------------------------------
@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    index_html = STATIC_DIR / "index.html"
    if index_html.is_file():
        return FileResponse(index_html, media_type="text/html")
    raise HTTPException(status_code=404, detail="App not found")

# --------------------------------------------------------------------
# Startup helpers
# --------------------------------------------------------------------
def run_migrations():
    """Run database migrations on startup"""
    try:
        logger.info("Running database migrations...")
        current_dir = os.getcwd()
        logger.debug(f"Current working directory: {current_dir}")

        try:
            result = subprocess.run(["which", "alembic"], capture_output=True, text=True)
            logger.debug(f"Alembic location: {result.stdout.strip() if result.stdout else 'Not found'}")
        except Exception as e:
            logger.debug(f"Could not check alembic location: {e}")

        logger.debug(f"Checking if /app exists: {os.path.exists('/app')}")
        if os.path.exists('/app'):
            logger.debug(f"Contents of /app: {os.listdir('/app')}")

        alembic_paths = [
            "alembic.ini",
            "../alembic.ini",
            "py_backend/alembic.ini",
            "/app/alembic.ini",
        ]
        alembic_dir = None
        for path in alembic_paths:
            if os.path.exists(path):
                alembic_dir = os.path.dirname(path)
                logger.debug(f"Found alembic.ini at: {path}")
                break
        if not alembic_dir:
            logger.warning("Could not find alembic.ini - using current directory")
            alembic_dir = current_dir

        try:
            logger.info(f"Running alembic upgrade head from: {alembic_dir}")
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                cwd=alembic_dir,
                capture_output=True,
                text=True,
                timeout=60,
            )
            logger.debug(f"Alembic return code: {result.returncode}")
            logger.debug(f"Alembic stdout: {result.stdout}")
            logger.debug(f"Alembic stderr: {result.stderr}")

            if result.returncode == 0:
                logger.info("Database migrations completed successfully")
            else:
                logger.error("Database migrations failed")
                logger.warning("Trying fallback: create tables directly...")
                try:
                    from app.database import engine
                    from app.models import Base
                    Base.metadata.create_all(bind=engine)
                    logger.info("Tables created directly via SQLAlchemy")
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed: {fallback_error}")
        except Exception as e:
            logger.error(f"Error running alembic: {e}")

    except Exception as e:
        logger.error(f"Could not run migrations: {e}")

def ensure_storage_ready():
    """Ensure storage is ready before starting the app"""
    logger.debug(f"Storage provider from settings: '{settings.STORAGE_PROVIDER}'")
    logger.debug(f"S3 endpoint from settings: '{settings.S3_ENDPOINT}'")
    logger.debug(f"S3 bucket from settings: '{settings.S3_BUCKET}'")
    if settings.STORAGE_PROVIDER == "s3":
        try:
            logger.info("Checking S3 storage connection...")
            from app.storage import _ensure_bucket
            _ensure_bucket()
            logger.info("S3 storage ready")
        except Exception as e:
            logger.warning(f"S3 storage not ready: {e}")
            logger.warning("Storage operations may fail until S3 is available")
    elif settings.STORAGE_PROVIDER == "local":
        logger.info("Using local storage - no external dependencies")
    else:
        logger.warning(f"Unknown storage provider: {settings.STORAGE_PROVIDER}")

# --------------------------------------------------------------------
# VLM service registration on startup
# --------------------------------------------------------------------
from app.services.vlm_service import vlm_manager

# Providers
from app.services.stub_vlm_service import StubVLMService
from app.services.gpt4v_service import GPT4VService
from app.services.gemini_service import GeminiService
from app.services.huggingface_service import ProvidersGenericVLMService

from app.database import SessionLocal
from app import crud
import asyncio


@app.on_event("startup")
async def startup_tasks() -> None:
    """Run all startup tasks including migrations, storage setup, and VLM service registration."""
    logger.info("Starting application initialization...")
    
    # Run database migrations
    logger.info("Running database migrations...")
    run_migrations()
    
    # Ensure storage is ready
    logger.info("Checking storage...")
    ensure_storage_ready()
    
    # Register VLM services
    logger.info("Registering VLM services...")

    # Always have a stub as a safe fallback
    try:
        vlm_manager.register_service(StubVLMService())
        logger.info("✓ STUB_MODEL registered")
    except Exception as e:
        logger.error(f"✗ Failed to register STUB_MODEL: {e}")

    # OpenAI GPT-4V (if configured)
    if settings.OPENAI_API_KEY:
        try:
            vlm_manager.register_service(GPT4VService(settings.OPENAI_API_KEY))
            logger.info("✓ GPT-4 Vision service registered")
        except Exception as e:
            logger.error(f"✗ GPT-4 Vision service failed to register: {e}")
    else:
        logger.info("○ GPT-4 Vision not configured (OPENAI_API_KEY missing)")

    # Google Gemini (if configured)
    if settings.GOOGLE_API_KEY:
        try:
            vlm_manager.register_service(GeminiService(settings.GOOGLE_API_KEY))
            logger.info("✓ Gemini service registered")
        except Exception as e:
            logger.error(f"✗ Gemini service failed to register: {e}")
    else:
        logger.info("○ Gemini not configured (GOOGLE_API_KEY missing)")

    # Hugging Face Inference Providers (if configured)
    if settings.HF_API_KEY:
        db = SessionLocal()
        try:
            models = crud.get_models(db)
            registered = 0
            skipped = 0
            for m in models:
                # Only register HF rows; skip “logical” names that map to other providers
                if (
                    getattr(m, "provider", "") == "huggingface"
                    and getattr(m, "model_id", None)
                    and m.m_code not in {"STUB_MODEL", "GPT-4O", "GEMINI15"}
                ):
                    try:
                        svc = ProvidersGenericVLMService(
                            api_key=settings.HF_API_KEY,
                            model_id=m.model_id,
                            public_name=m.m_code,  # stable name your UI/DB uses
                        )
                        vlm_manager.register_service(svc)
                        logger.info(f"✓ HF registered: {m.m_code} -> {m.model_id}")
                        registered += 1
                    except Exception as e:
                        logger.error(f"✗ HF model {m.m_code} failed to register: {e}")
                else:
                    skipped += 1

            if registered:
                logger.info(f"✓ Hugging Face services registered: {registered}")
            else:
                logger.info("○ No Hugging Face models registered (none found or all skipped)")
            if skipped:
                logger.info(f"ℹ HF skipped entries: {skipped}")
        finally:
            db.close()
    else:
        logger.info("○ Hugging Face not configured (HF_API_KEY missing)")

    # Kick off lightweight probes in the background (don't block startup)
    try:
        asyncio.create_task(vlm_manager.probe_all())
    except Exception as e:
        logger.error(f"Probe scheduling failed: {e}")

    logger.info(f"✓ Available models now: {', '.join(vlm_manager.get_available_models())}")
    logger.info(f"✓ Total services: {len(vlm_manager.services)}")


logger.info("PromptAid Vision API server ready")
logger.info("Endpoints: /api/images, /api/captions, /api/metadata, /api/models")
logger.info(f"Environment: {settings.ENVIRONMENT}")
logger.info("CORS: localhost + *.hf.space")
