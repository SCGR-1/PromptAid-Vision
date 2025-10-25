from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import logging
from .. import crud, database, schemas

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.PromptOut])
def get_prompts(db: Session = Depends(get_db)):
    """Get all available prompts"""
    logger.debug("get_prompts called")
    try:
        prompts = crud.get_prompts(db)
        logger.debug(f"Found {len(prompts)} prompts")
        for prompt in prompts:
            logger.debug(f"  - {prompt.p_code}: {prompt.label} ({prompt.image_type}, active: {prompt.is_active})")
        return prompts
    except Exception as e:
        logger.error(f"Error in get_prompts: {e}")
        raise

@router.post("/", response_model=schemas.PromptOut)
def create_prompt(prompt_data: schemas.PromptCreate, db: Session = Depends(get_db)):
    """Create a new prompt"""
    try:
        prompt = crud.create_prompt(db, prompt_data)
        return prompt
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))

@router.get("/active/{image_type}", response_model=schemas.PromptOut)
def get_active_prompt(image_type: str, db: Session = Depends(get_db)):
    """Get the active prompt for a specific image type"""
    prompt = crud.get_active_prompt_by_image_type(db, image_type)
    if not prompt:
        from fastapi import HTTPException
        raise HTTPException(404, "No active prompt found for this image type")
    return prompt

@router.get("/{p_code}", response_model=schemas.PromptOut)
def get_prompt(p_code: str, db: Session = Depends(get_db)):
    """Get a specific prompt by code"""
    prompt = crud.get_prompt(db, p_code)
    if not prompt:
        from fastapi import HTTPException
        raise HTTPException(404, "Prompt not found")
    return prompt

@router.put("/{p_code}", response_model=schemas.PromptOut)
def update_prompt(p_code: str, prompt_update: schemas.PromptUpdate, db: Session = Depends(get_db)):
    """Update a specific prompt by code"""
    prompt = crud.update_prompt(db, p_code, prompt_update)
    if not prompt:
        from fastapi import HTTPException
        raise HTTPException(404, "Prompt not found")
    return prompt

@router.post("/{p_code}/toggle-active", response_model=schemas.PromptOut)
def toggle_prompt_active(p_code: str, image_type: str, db: Session = Depends(get_db)):
    """Toggle the active status of a prompt for a specific image type"""
    try:
        prompt = crud.toggle_prompt_active_status(db, p_code, image_type)
        if not prompt:
            from fastapi import HTTPException
            raise HTTPException(404, "Prompt not found")
        return prompt
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))
