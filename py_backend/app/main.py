# py_backend/app/main.py
import os
import subprocess
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse

from app.config import settings
from app.routers import upload, caption, metadata, models
from app.routers.images import router as images_router

app = FastAPI(title="PromptAid Vision")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://localhost:5173"],
    allow_origin_regex=r"https://.*\.hf\.space$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(caption.router,     prefix="/api",            tags=["captions"])
app.include_router(metadata.router,    prefix="/api",            tags=["metadata"])
app.include_router(models.router,      prefix="/api",            tags=["models"])
app.include_router(upload.router,      prefix="/api/images",     tags=["images"])
app.include_router(images_router,      prefix="/api/contribute", tags=["contribute"])

@app.get("/health", include_in_schema=False, response_class=JSONResponse)
async def health():
    return {"status": "ok"}

@app.get("/", include_in_schema=False, response_class=HTMLResponse)
def root():
    return """<!doctype html>
<title>PromptAid Vision</title>
<h1>PromptAid Vision</h1>
<p>OK</p>
<p><a href="/app/">Open UI</a> • <a href="/docs">API Docs</a></p>"""

STATIC_DIR = "/app/static"
print(f"🔍 Looking for static files in: {STATIC_DIR}")  # Debug line

if os.path.isdir(STATIC_DIR):
    print(f"✅ Static directory found: {STATIC_DIR}")
    app.mount("/app", StaticFiles(directory=STATIC_DIR, html=True), name="static")
else:
    print(f"❌ Static directory NOT found: {STATIC_DIR}")
    print(f"📁 Current directory contents: {os.listdir(os.path.dirname(__file__))}")

@app.get("/app/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    index = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Not Found")

@app.get("/debug")
async def debug():
    return {
        "message": "Backend is working",
        "timestamp": datetime.now().isoformat(),
        "routes": [route.path for route in app.routes]
    }

@app.get("/debug-static")
async def debug_static():
    import os
    return {
        "static_dir": STATIC_DIR,
        "exists": os.path.exists(STATIC_DIR),
        "is_dir": os.path.isdir(STATIC_DIR) if os.path.exists(STATIC_DIR) else False,
        "current_dir": os.getcwd(),
        "app_dir": os.path.dirname(__file__),
        "parent_dir": os.path.dirname(os.path.dirname(__file__))
    }

@app.get("/debug-storage")
async def debug_storage():
    """Debug storage configuration and files"""
    import os
    from app.config import settings
    
    storage_dir = settings.STORAGE_DIR
    storage_exists = os.path.exists(storage_dir)
    
    files = []
    if storage_exists:
        try:
            for root, dirs, filenames in os.walk(storage_dir):
                for filename in filenames[:10]:  # Limit to first 10 files
                    rel_path = os.path.relpath(os.path.join(root, filename), storage_dir)
                    files.append(rel_path)
        except Exception as e:
            files = [f"Error listing files: {e}"]
    
    return {
        "storage_provider": settings.STORAGE_PROVIDER,
        "storage_dir": storage_dir,
        "storage_exists": storage_exists,
        "storage_is_dir": os.path.isdir(storage_dir) if storage_exists else False,
        "current_dir": os.getcwd(),
        "sample_files": files[:10],
        "total_files": len(files) if isinstance(files, list) else 0
    }

@app.get("/uploads/{file_path:path}")
async def serve_upload(file_path: str):
    """Serve uploaded files from local storage"""
    if settings.STORAGE_PROVIDER != "local":
        raise HTTPException(status_code=404, detail="Local storage not enabled")
    
    file_path_full = os.path.join(settings.STORAGE_DIR, file_path)
    if not os.path.exists(file_path_full):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path_full)

def run_migrations():
    """Run database migrations on startup"""
    try:
        print("🔄 Running database migrations...")
        
        # Check what's available in the container
        print("🔍 Checking container environment...")
        try:
            result = subprocess.run(["which", "alembic"], capture_output=True, text=True)
            print(f"📍 Alembic location: {result.stdout.strip() if result.stdout else 'Not found'}")
        except Exception as e:
            print(f"⚠️ Could not check alembic location: {e}")
        
        # Check the correct directory structure
        print(f"📁 Checking if /app exists: {os.path.exists('/app')}")
        if os.path.exists('/app'):
            print(f"📁 Contents of /app: {os.listdir('/app')}")
        
        # Find where alembic.ini is located
        alembic_paths = [
            "/app/alembic.ini",
            "/app/py_backend/alembic.ini", 
            "/app/app/alembic.ini"
        ]
        
        alembic_dir = None
        for path in alembic_paths:
            if os.path.exists(path):
                alembic_dir = os.path.dirname(path)
                print(f"✅ Found alembic.ini at: {path}")
                break
        
        if not alembic_dir:
            print("❌ Could not find alembic.ini - checking current directory")
            alembic_dir = "/app"
        
        # Try to run alembic
        try:
            print(f"🔍 Running alembic upgrade head from: {alembic_dir}")
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                cwd=alembic_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            print(f"📊 Alembic return code: {result.returncode}")
            print(f"📊 Alembic stdout: {result.stdout}")
            print(f"📊 Alembic stderr: {result.stderr}")
            
            if result.returncode == 0:
                print("✅ Database migrations completed successfully")
            else:
                print(f"❌ Database migrations failed")
                print("🔄 Trying fallback: create tables directly...")
                try:
                    from app.database import engine
                    from app.models import Base
                    Base.metadata.create_all(bind=engine)
                    print("✅ Tables created directly via SQLAlchemy")
                except Exception as fallback_error:
                    print(f"❌ Fallback also failed: {fallback_error}")
        except Exception as e:
            print(f"❌ Error running alembic: {e}")
        
    except Exception as e:
        print(f"⚠️ Could not run migrations: {e}")

# Run migrations on startup
run_migrations()

print("🚀 PromptAid Vision API server ready")
print("📊 Endpoints: /api/images, /api/captions, /api/metadata, /api/models")
print(f"🌍 Environment: {settings.ENVIRONMENT}")
print("🔗 CORS: localhost + *.hf.space")
