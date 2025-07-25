# py_backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, caption, metadata
from app.config import settings
import boto3

app = FastAPI(title="PromptAid Vision")

# CORS: allow your React dev server(s)
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

# Mount routers
app.include_router(upload.router,   prefix="/api/maps", tags=["maps"])
app.include_router(caption.router,  prefix="/api",      tags=["captions"])
app.include_router(metadata.router, prefix="/api",      tags=["metadata"])

