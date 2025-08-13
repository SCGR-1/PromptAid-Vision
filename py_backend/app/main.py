from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, caption, metadata, models
from app.config import settings
from app.routers.images import router as images_router

app = FastAPI(title="PromptAid Vision")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://huggingface.co",
        "https://*.hf.space",
        "https://*.hf.space",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(caption.router,  prefix="/api",      tags=["captions"])
app.include_router(metadata.router, prefix="/api",      tags=["metadata"])
app.include_router(models.router,   prefix="/api",      tags=["models"])
app.include_router(upload.router,   prefix="/api/images", tags=["images"])
app.include_router(images_router,  prefix="/api/contribute", tags=["contribute"])

print("🚀 PromptAid Vision API server ready")
print("📊 Available endpoints: /api/images, /api/captions, /api/metadata, /api/models")
print(f"🌍 Environment: {settings.ENVIRONMENT}")
print("🔗 CORS enabled for Hugging Face Spaces")



