import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.routers import upload, caption, metadata, models
from app.routers.images import router as images_router

app = FastAPI(title="PromptAid Vision")

# CORS: allow localhost dev and all *.hf.space
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_origin_regex=r"https://.*\.hf\.space$",  # Hugging Face subdomains
    allow_credentials=False,  # must be False if using "*" or regex
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- API routers (keep them under /api) ----
app.include_router(caption.router,    prefix="/api",           tags=["captions"])
app.include_router(metadata.router,   prefix="/api",           tags=["metadata"])
app.include_router(models.router,     prefix="/api",           tags=["models"])
app.include_router(upload.router,     prefix="/api/images",    tags=["images"])
app.include_router(images_router,     prefix="/api/contribute", tags=["contribute"])

# Simple health endpoint for HF health checks
@app.get("/health", include_in_schema=False, response_class=JSONResponse)
async def health():
    return {"status": "ok"}

# ---- Serve built frontend (Vite) ----
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

# SPA fallback for client-side routes; don't intercept API or docs
@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith(("api", "docs", "redoc", "openapi")):
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

print("🚀 PromptAid Vision API server ready")
print("📊 Available endpoints: /api/images, /api/captions, /api/metadata, /api/models")
print(f"🌍 Environment: {settings.ENVIRONMENT}")
print("🔗 CORS enabled for localhost and *.hf.space")
