FROM python:3.11-slim

# Build deps for psycopg2 etc.
RUN apt-get update && apt-get install -y \
    build-essential gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better caching
COPY py_backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend code
COPY py_backend/ /app/

# Copy startup script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Default runtime env (can be overridden by Space Secrets)
ENV DATABASE_URL=sqlite:////data/app.db
ENV STORAGE_PROVIDER=local
ENV STORAGE_DIR=/data/uploads
ENV HF_HOME=/data/.cache/huggingface

# Create writable data dirs (enable “Persistent storage” in Space settings to keep them)
RUN mkdir -p /data/uploads && chmod -R 777 /data

# Hugging Face sets PORT; default to 7860
ENV PORT=7860
EXPOSE 7860

# Run via shell script so $PORT is expanded before reaching uvicorn
ENTRYPOINT ["/app/entrypoint.sh"]
