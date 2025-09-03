# ---------- Build frontend ----------
    FROM node:20-alpine AS fe
    WORKDIR /fe
    COPY frontend/package*.json ./
    RUN npm ci
    COPY frontend/ .
    RUN npm run build   # produces /fe/dist
    RUN echo "Frontend built at $(date)" > /fe/build-timestamp.txt
    RUN echo "Backend updated at $(date)" > /fe/backend-timestamp.txt
    RUN echo "Complete rebuild forced at $(date)" > /fe/force-rebuild.txt
    
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
    
    # Data dirs & sensible defaults
    RUN mkdir -p /data/uploads && chmod -R 777 /data
    ENV STORAGE_DIR=/data/uploads
    ENV HF_HOME=/data/.cache/huggingface
    
    ENV PORT=7860
    EXPOSE 7860
    
    # Create startup script
    RUN echo '#!/bin/bash\n\
echo "Starting PromptAid Vision..."\n\
echo "Running database migrations..."\n\
alembic upgrade head\n\
echo "Database migrations completed"\n\
echo "Generating thumbnails for existing images..."\n\
python generate_production_thumbnails.py\n\
echo "Thumbnail generation completed"\n\
echo "Starting FastAPI server..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT\n\
' > /app/start.sh && chmod +x /app/start.sh
    
    # Start backend (serves API + static frontend)
    CMD ["/app/start.sh"]
    