from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException
import io
from sqlalchemy.orm import Session
from .. import crud, schemas, storage, database

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.MapOut)
async def upload_map(
    source: str        = Form(...),
    region: str        = Form(...),
    category: str      = Form(...),
    countries: list[str] = Form([]),
    file: UploadFile   = Form(...),
    db: Session        = Depends(get_db)
):
    # 1) read & hash
    content = await file.read()
    sha     = crud.hash_bytes(content)

    # 2) upload to S3/MinIO (or local FS)
    key = storage.upload_fileobj(io.BytesIO(content), file.filename)

    # 3) persist the DB record
    m = crud.create_map(db, source, region, category, key, sha, countries)

    # 4) generate a URL for your front‑end
    #
    # If you have an S3/MinIO client in storage:
    try:
        url = storage.get_presigned_url(key, expires_in=3600)
    except AttributeError:
        # fallback: if you’re serving via StaticFiles("/uploads")
        url = f"/uploads/{key}"

    # 5) return the Map plus that URL
    return schemas.MapOut(
        map_id    = m.map_id,
        file_key  = m.file_key,
        sha256    = m.sha256,
        source    = m.source,
        region    = m.region,
        category  = m.category,
        countries = [c.c_code for c in m.countries],  # or however you model it
        created_at = m.created_at,
        image_url = url,
    )
