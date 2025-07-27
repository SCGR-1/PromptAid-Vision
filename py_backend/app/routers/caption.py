from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .. import crud, database, schemas, storage
import io

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Stub captioner for now ---
class CaptionerStub:
    def generate(self, image_bytes: bytes) -> tuple[str,str,dict]:
        text = "This is a fake caption."
        model = "STUB_MODEL"
        raw = {"stub": True}
        return text, model, raw

cap = CaptionerStub()

@router.post("/maps/{map_id}/caption", response_model=schemas.CaptionOut)
def create_caption(map_id: str, db: Session = Depends(get_db)):
    m = crud.get_map(db, map_id)
    if not m:
        raise HTTPException(404, "map not found")

    # fetch image bytes from S3
    url = storage.generate_presigned_url(m.file_key)
    # (in real code, you might stream from S3 directly)
    import requests
    resp = requests.get(url)
    img_bytes = resp.content

    # generate caption
    text, model, raw = cap.generate(img_bytes)

    # insert into DB
    c = crud.create_caption(db, map_id, model, raw, text)
    return c

@router.get("/captions/{cap_id}", response_model=schemas.CaptionOut)
def get_caption(cap_id: str, db: Session = Depends(get_db)):
    c = crud.get_caption(db, cap_id)
    if not c:
        raise HTTPException(404, "caption not found")
    return c

@router.put("/captions/{cap_id}", response_model=schemas.CaptionOut)
def update_caption(cap_id: str, update: schemas.CaptionUpdate, db: Session = Depends(get_db)):
    c = crud.update_caption(db, cap_id, **update.dict())
    if not c:
        raise HTTPException(404, "caption not found")
    return c
