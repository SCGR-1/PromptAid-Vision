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
    source: str = Form(...),
    region: str = Form(...),
    category: str = Form(...),
    countries: list[str] = Form([]),
    file: UploadFile = Form(...),
    db: Session = Depends(get_db)
):
    # 1) read & hash
    content = await file.read()
    sha = crud.hash_bytes(content)

    # 2) upload to S3
    key = storage.upload_fileobj(io.BytesIO(content), file.filename)

    # 3) insert into DB
    m = crud.create_map(db, source, region, category, key, sha, countries)
    return m
