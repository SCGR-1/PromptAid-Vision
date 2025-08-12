from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, caption, metadata, models
from app.config import settings

app = FastAPI(title="PromptAid Vision")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router,   prefix="/api/images", tags=["images"])
app.include_router(caption.router,  prefix="/api",      tags=["captions"])
app.include_router(metadata.router, prefix="/api",      tags=["metadata"])
app.include_router(models.router,   prefix="/api",      tags=["models"])



