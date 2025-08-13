from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .. import crud, database, schemas
from ..services.vlm_service import vlm_manager
from typing import Dict, Any

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/models")
def get_available_models(db: Session = Depends(get_db)):
    """Get all available VLM models"""
    try:
        db_models = crud.get_models(db)
        
        models_info = []
        for model in db_models:
            models_info.append({
                "m_code": model.m_code,
                "label": model.label,
                "model_type": model.model_type,
                "is_available": model.is_available,
                "config": model.config
            })
        
        return {"models": models_info}
    except Exception as e:
        raise HTTPException(500, f"Failed to get models: {str(e)}")

@router.get("/models/{model_code}")
def get_model_info(model_code: str, db: Session = Depends(get_db)):
    """Get specific model information"""
    try:
        db_model = crud.get_model(db, model_code)
        if not db_model:
            raise HTTPException(404, "Model not found")
        
        return {
            "m_code": db_model.m_code,
            "label": db_model.label,
            "model_type": db_model.model_type,
            "is_available": db_model.is_available,
            "config": db_model.config
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get model info: {str(e)}")

@router.post("/models/{model_code}/test")
async def test_model(model_code: str, db: Session = Depends(get_db)):
    """Test a specific model with a sample image"""
    try:
        service = vlm_manager.services.get(model_code)
        if not service:
            raise HTTPException(404, "Model service not found")
        
        test_image_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xf6\x178\x00\x00\x00\x00IEND\xaeB`\x82'
        
        result = await service.generate_caption(test_image_bytes, "Describe this image.")
        
        return {
            "model": model_code,
            "test_result": result,
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Model test failed: {str(e)}")

@router.post("/models/{model_code}/toggle")
def toggle_model_availability(model_code: str, toggle_data: schemas.ModelToggleRequest, db: Session = Depends(get_db)):
    """Toggle model availability"""
    try:
        db_model = crud.get_model(db, model_code)
        if not db_model:
            raise HTTPException(404, "Model not found")
        
        new_availability = toggle_data.is_available
        db_model.is_available = new_availability
        
        db.commit()
        
        return {
            "model_code": model_code,
            "is_available": new_availability,
            "message": f"Model {model_code} availability set to {new_availability}"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to toggle model availability: {str(e)}") 