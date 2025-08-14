# py_backend/app/main.py
import os
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

print("🚀 PromptAid Vision API server ready")
print("📊 Endpoints: /api/images, /api/captions, /api/metadata, /api/models")
print(f"🌍 Environment: {settings.ENVIRONMENT}")
print("🔗 CORS: localhost + *.hf.space")
