FROM python:3.11-slim

# Build deps for psycopg2 etc.
RUN apt-get update && apt-get install -y \
    build-essential gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for caching
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend code
COPY . /app/

# Create data directory for persistent storage
RUN mkdir -p /data/uploads && chmod -R 777 /data

# Set environment variables
ENV DATABASE_URL=sqlite:////data/app.db
ENV STORAGE_PROVIDER=local
ENV STORAGE_DIR=/data/uploads
ENV HF_HOME=/data/.cache/huggingface
ENV PORT=7860

EXPOSE 7860

# Use shell form for proper environment variable substitution
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
