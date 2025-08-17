from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, database, schemas

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.PromptOut])
def get_prompts(db: Session = Depends(get_db)):
    """Get all available prompts"""
    return crud.get_prompts(db)

@router.get("/{p_code}", response_model=schemas.PromptOut)
def get_prompt(p_code: str, db: Session = Depends(get_db)):
    """Get a specific prompt by code"""
    prompt = crud.get_prompt(db, p_code)
    if not prompt:
        from fastapi import HTTPException
        raise HTTPException(404, "Prompt not found")
    return prompt
