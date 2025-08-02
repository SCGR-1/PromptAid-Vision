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


@router.get("/", response_model=list[schemas.ImageOut])
def list_images(db: Session = Depends(get_db)):
    images = crud.get_images(db)
    return [
        schemas.ImageOut(
            image_id=img.image_id,
            file_key=img.file_key,
            sha256=img.sha256,
            source=img.source,
            type=img.type,
            epsg=img.epsg,
            image_type=img.image_type,
            caption=img.caption,
            image_url=storage.generate_presigned_url(img.file_key, expires_in=3600)
        ) for img in images
    ]

@router.get("/{image_id}", response_model=schemas.ImageOut)
def get_image(image_id: str, db: Session = Depends(get_db)):
    img = crud.get_image(db, image_id)
    if not img:
        raise HTTPException(404, "image not found")
    
    return schemas.ImageOut(
        image_id=img.image_id,
        file_key=img.file_key,
        sha256=img.sha256,
        source=img.source,
        type=img.type,
        epsg=img.epsg,
        image_type=img.image_type,
        caption=img.caption,
        image_url=storage.generate_presigned_url(img.file_key, expires_in=3600)
    )


@router.post("/", response_model=schemas.ImageOut)
async def upload_image(
    source: str        = Form(...),
    type: str          = Form(...),
    countries: list[str] = Form([]),
    epsg: str          = Form(...),
    image_type: str    = Form(...),
    file: UploadFile   = Form(...),
    db: Session        = Depends(get_db)
):
    # 1) read & hash
    content = await file.read()
    sha     = crud.hash_bytes(content)

    # 2) upload to S3/MinIO (or local FS)
    key = storage.upload_fileobj(io.BytesIO(content), file.filename)

    # 3) persist the DB record
    img = crud.create_image(db, source, type, key, sha, countries, epsg, image_type)

    # 4) generate a URL for your front‑end
    #
    # If you have an S3/MinIO client in storage:
    try:
        url = storage.generate_presigned_url(key, expires_in=3600)
    except AttributeError:
        # fallback: if you're serving via StaticFiles("/uploads")
        url = f"/uploads/{key}"

    # 5) return the Image plus that URL
    return schemas.ImageOut(
        image_id    = img.image_id,
        file_key  = img.file_key,
        sha256    = img.sha256,
        source    = img.source,
        type      = img.type,
        epsg      = img.epsg,
        image_type = img.image_type,
        image_url = url,
    )
