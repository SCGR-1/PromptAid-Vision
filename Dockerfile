# Dockerfile (root)
FROM python:3.11-slim

# Optional: packages for building wheels like psycopg2
RUN apt-get update && apt-get install -y \
    build-essential gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) copy requirements from py_backend
COPY py_backend/requirements.txt /tmp/requirements.txt

# 2) install deps first (better layer caching)
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# 3) copy the backend source
COPY py_backend/ /app/

# 4) run the app on the port Spaces provides
ENV PORT=7860
EXPOSE 7860
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","${PORT:-7860}"]
