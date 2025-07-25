from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .. import crud, database, schemas

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.put("/maps/{map_id}/metadata", response_model=schemas.CaptionOut)
def update_metadata(
    map_id: str,
    update: schemas.CaptionUpdate,
    db: Session = Depends(get_db)
):
    # we stored cap_id == map_id in Go; here cap_id is uuid on captions table
    c = crud.update_caption(db, map_id, **update.dict())
    if not c:
        raise HTTPException(404, "caption not found")
    return c
