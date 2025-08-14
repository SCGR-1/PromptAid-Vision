FROM python:3.11-slim

# Build deps for psycopg2 etc. (safe to keep)
RUN apt-get update && apt-get install -y \
    build-essential gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for caching
COPY py_backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend
COPY py_backend/ /app/

# ---- Demo-friendly defaults (no Compose) ----
# Persist stuff under /data (enable "Persistent storage" in Space settings)
RUN mkdir -p /data/uploads && chmod -R 777 /data
ENV DATABASE_URL=sqlite:////data/app.db
ENV STORAGE_PROVIDER=local
ENV STORAGE_DIR=/data/uploads
ENV HF_HOME=/data/.cache/huggingface
# ---------------------------------------------

# Hugging Face Spaces will set PORT, default to 7860
ENV PORT=7860
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "${PORT:-7860}"]
