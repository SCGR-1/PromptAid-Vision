from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from .. import crud, database, schemas
from ..services.schema_validator import schema_validator
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..routers.admin import verify_admin_token

router = APIRouter()
security = HTTPBearer()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_admin_access(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin token for schema endpoints"""
    token = credentials.credentials
    
    if not verify_admin_token(token):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired admin token"
        )
    
    return token

@router.get("/schemas", response_model=List[Dict[str, Any]])
async def get_schemas(
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_access)
):
    """Get all JSON schemas (admin only)"""
    try:
        # Get schemas from database
        db_schemas = crud.get_all_schemas(db)
        
        schemas_list = []
        for schema in db_schemas:
            schemas_list.append({
                "schema_id": schema.schema_id,
                "title": schema.title,
                "version": schema.version,
                "created_at": schema.created_at.isoformat() if schema.created_at else None,
                "schema": schema.schema
            })
        
        return schemas_list
    except Exception as e:
        raise HTTPException(500, f"Failed to get schemas: {str(e)}")

@router.get("/schemas/{schema_id}", response_model=Dict[str, Any])
async def get_schema(
    schema_id: str,
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_access)
):
    """Get a specific JSON schema (admin only)"""
    try:
        schema = crud.get_schema(db, schema_id)
        if not schema:
            raise HTTPException(404, f"Schema {schema_id} not found")
        
        return {
            "schema_id": schema.schema_id,
            "title": schema.title,
            "version": schema.version,
            "created_at": schema.created_at.isoformat() if schema.created_at else None,
            "schema": schema.schema
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get schema: {str(e)}")

@router.post("/schemas/validate")
async def validate_data_against_schema(
    data: Dict[str, Any],
    schema_id: str,
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_access)
):
    """Validate JSON data against a specific schema (admin only)"""
    try:
        # Get the schema from database
        schema = crud.get_schema(db, schema_id)
        if not schema:
            raise HTTPException(404, f"Schema {schema_id} not found")
        
        # Validate the data
        is_valid, error_msg = schema_validator.validate_against_schema(
            data, schema.schema, schema_id
        )
        
        return {
            "is_valid": is_valid,
            "error_message": error_msg,
            "schema_id": schema_id,
            "data": data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Validation failed: {str(e)}")

@router.post("/schemas/test-validation")
async def test_schema_validation(
    image_type: str,
    data: Dict[str, Any],
    token: str = Depends(verify_admin_access)
):
    """Test data validation against image type schemas (admin only)"""
    try:
        # Validate data against the appropriate schema for the image type
        cleaned_data, is_valid, error_msg = schema_validator.clean_and_validate_data(
            data, image_type
        )
        
        return {
            "is_valid": is_valid,
            "error_message": error_msg,
            "image_type": image_type,
            "original_data": data,
            "cleaned_data": cleaned_data if is_valid else None
        }
    except Exception as e:
        raise HTTPException(500, f"Test validation failed: {str(e)}")

@router.get("/schemas/validation-stats")
async def get_validation_stats(
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_access)
):
    """Get validation statistics (admin only)"""
    try:
        # Get recent images with validation info
        recent_images = crud.get_recent_images_with_validation(db, limit=100)
        
        stats = {
            "total_images": len(recent_images),
            "validation_passed": 0,
            "validation_failed": 0,
            "validation_errors": [],
            "by_image_type": {
                "crisis_map": {"total": 0, "passed": 0, "failed": 0},
                "drone_image": {"total": 0, "passed": 0, "failed": 0}
            }
        }
        
        for img in recent_images:
            if hasattr(img, 'raw_json') and img.raw_json:
                image_type = img.image_type
                if image_type in stats["by_image_type"]:
                    stats["by_image_type"][image_type]["total"] += 1
                
                # Check if validation failed
                if img.raw_json.get("validation_failed"):
                    stats["validation_failed"] += 1
                    if image_type in stats["by_image_type"]:
                        stats["by_image_type"][image_type]["failed"] += 1
                    
                    error = img.raw_json.get("validation_error", "Unknown error")
                    stats["validation_errors"].append({
                        "image_id": str(img.image_id),
                        "image_type": image_type,
                        "error": error,
                        "created_at": img.created_at.isoformat() if img.created_at else None
                    })
                else:
                    stats["validation_passed"] += 1
                    if image_type in stats["by_image_type"]:
                        stats["by_image_type"][image_type]["passed"] += 1
        
        return stats
    except Exception as e:
        raise HTTPException(500, f"Failed to get validation stats: {str(e)}")

@router.put("/schemas/{schema_id}")
async def update_schema(
    schema_id: str,
    schema_data: Dict[str, Any],
    db: Session = Depends(get_db),
    token: str = Depends(verify_admin_access)
):
    """Update a JSON schema (admin only)"""
    try:
        # Get the existing schema
        existing_schema = crud.get_schema(db, schema_id)
        if not existing_schema:
            raise HTTPException(404, f"Schema {schema_id} not found")
        
        # Update only the schema content
        existing_schema.schema = schema_data.get("schema", existing_schema.schema)
        
        db.commit()
        db.refresh(existing_schema)
        
        # Clear schema cache to ensure fresh data on next validation
        schema_validator.clear_schema_cache(schema_id)
        
        return {
            "schema_id": existing_schema.schema_id,
            "title": existing_schema.title,
            "version": existing_schema.version,
            "created_at": existing_schema.created_at.isoformat() if existing_schema.created_at else None,
            "schema": existing_schema.schema
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to update schema: {str(e)}")