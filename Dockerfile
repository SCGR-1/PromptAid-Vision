# ---------- Build frontend ----------
    FROM node:20-alpine AS fe
    WORKDIR /fe
    COPY frontend/package*.json ./
    RUN npm ci
    COPY frontend/ .
    RUN npm run build   # produces /fe/dist
    
    # ---------- Backend image ----------
    FROM python:3.11-slim
    
    RUN apt-get update && apt-get install -y \
        build-essential gcc libpq-dev \
     && rm -rf /var/lib/apt/lists/*
    
    WORKDIR /app
    
    # Install backend deps
    COPY py_backend/requirements.txt /tmp/requirements.txt
    RUN pip install --no-cache-dir -r /tmp/requirements.txt
    
    # Copy backend code
    COPY py_backend/ /app/
    
    # Copy built frontend into the image (served by FastAPI)
    COPY --from=fe /fe/dist /app/static
    
    # Data dirs & sensible defaults (you can keep sqlite fallback if you want)
    RUN mkdir -p /data/uploads && chmod -R 777 /data
    ENV STORAGE_PROVIDER=local
    ENV STORAGE_DIR=/data/uploads
    ENV HF_HOME=/data/.cache/huggingface
    
    # Spaces provides PORT; default to 7860 locally
    ENV PORT=7860
    EXPOSE 7860
    
    # Start backend (serves API + static frontend)
    CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
    