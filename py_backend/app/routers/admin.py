import os
import jwt
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..config import settings
from .. import crud

router = APIRouter()
security = HTTPBearer()

# Models
class AdminLoginRequest(BaseModel):
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str

class AdminVerifyResponse(BaseModel):
    valid: bool
    message: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_admin_password():
    """Get admin password from environment variable"""
    password = os.getenv('ADMIN_PASSWORD')
    if not password:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_PASSWORD environment variable not set"
        )
    return password

def create_admin_token():
    """Create a JWT token for admin authentication"""
    # In production, use a proper secret key
    secret_key = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    
    payload = {
        'role': 'admin',
        'exp': datetime.utcnow() + timedelta(hours=24),  # 24 hour expiry
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(payload, secret_key, algorithm='HS256')
    return token

def verify_admin_token(token: str):
    """Verify the admin JWT token"""
    try:
        secret_key = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        if payload.get('role') != 'admin':
            return False
        
        # Check if token is expired
        exp = payload.get('exp')
        if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
            return False
            
        return True
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """Admin login endpoint"""
    admin_password = get_admin_password()
    
    # Hash the provided password and compare with stored hash
    # For now, using simple comparison (in production, use proper hashing)
    if request.password == admin_password:
        token = create_admin_token()
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        return AdminLoginResponse(
            access_token=token,
            expires_at=expires_at.isoformat()
        )
    else:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin password"
        )

@router.post("/verify", response_model=AdminVerifyResponse)
async def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin token endpoint"""
    token = credentials.credentials
    
    if verify_admin_token(token):
        return AdminVerifyResponse(
            valid=True,
            message="Token is valid"
        )
    else:
        return AdminVerifyResponse(
            valid=False,
            message="Token is invalid or expired"
        )

@router.get("/status")
async def admin_status(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get admin status (protected endpoint)"""
    token = credentials.credentials
    
    if not verify_admin_token(token):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    return {
        "status": "authenticated",
        "role": "admin",
        "timestamp": datetime.utcnow().isoformat()
    }

# Model Management Endpoints
class ModelCreateRequest(BaseModel):
    m_code: str
    label: str
    model_type: str
    provider: str
    model_id: str
    is_available: bool = False

class ModelUpdateRequest(BaseModel):
    label: str | None = None
    model_type: str | None = None
    provider: str | None = None
    model_id: str | None = None
    is_available: bool | None = None
    is_fallback: bool | None = None

@router.post("/models", response_model=dict)
async def create_model(
    request: ModelCreateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new model (admin only)"""
    token = credentials.credentials
    
    if not verify_admin_token(token):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    try:
        # Check if model already exists
        existing_model = crud.get_model(db, request.m_code)
        if existing_model:
            raise HTTPException(
                status_code=400,
                detail=f"Model with code '{request.m_code}' already exists"
            )
        
        # Create new model
        new_model = crud.create_model(
            db,
            m_code=request.m_code,
            label=request.label,
            model_type=request.model_type,
            provider=request.provider,
            model_id=request.model_id,
            is_available=request.is_available
        )
        
        return {
            "message": "Model created successfully",
            "model": {
                "m_code": new_model.m_code,
                "label": new_model.label,
                "model_type": new_model.model_type,
                "provider": new_model.provider,
                "model_id": new_model.model_id,
                "is_available": new_model.is_available
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create model: {str(e)}"
        )

@router.put("/models/{model_code}", response_model=dict)
async def update_model(
    model_code: str,
    request: ModelUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Update an existing model (admin only)"""
    token = credentials.credentials
    
    if not verify_admin_token(token):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    try:
        # Check if model exists
        existing_model = crud.get_model(db, model_code)
        if not existing_model:
            raise HTTPException(
                status_code=404,
                detail=f"Model '{model_code}' not found"
            )
        
        # Handle fallback model setting specially
        if request.is_fallback is not None and request.is_fallback:
            # Set this model as fallback (will clear others)
            crud.set_fallback_model(db, model_code)
            updated_model = crud.get_model(db, model_code)
        else:
            # Update model fields normally
            update_data = {}
            if request.label is not None:
                update_data["label"] = request.label
            if request.model_type is not None:
                update_data["model_type"] = request.model_type
            if request.is_available is not None:
                update_data["is_available"] = request.is_available
            if request.is_fallback is not None and not request.is_fallback:
                update_data["is_fallback"] = False
            
            # Update config column for provider and model_id
            config_updates = {}
            if request.provider is not None:
                config_updates["provider"] = request.provider
            if request.model_id is not None:
                config_updates["model_id"] = request.model_id
            
            if config_updates:
                # Get current config or create empty dict
                current_config = existing_model.config or {}
                # Merge with updates
                updated_config = {**current_config, **config_updates}
                update_data["config"] = updated_config
            
            updated_model = crud.update_model(db, model_code, update_data)
        
        return {
            "message": "Model updated successfully",
            "model": {
                "m_code": updated_model.m_code,
                "label": updated_model.label,
                "model_type": updated_model.model_type,
                "is_available": updated_model.is_available,
                "config": updated_model.config or {}
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update model: {str(e)}"
        )

@router.get("/fallback-model", response_model=dict)
async def get_fallback_model(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get the current fallback model"""
    token = credentials.credentials
    
    if not verify_admin_token(token):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    try:
        fallback_model_code = crud.get_fallback_model(db)
        if fallback_model_code:
            fallback_model = crud.get_model(db, fallback_model_code)
            return {
                "fallback_model": {
                    "m_code": fallback_model.m_code,
                    "label": fallback_model.label,
                    "is_available": fallback_model.is_available
                }
            }
        else:
            return {"fallback_model": None}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get fallback model: {str(e)}"
        )

@router.delete("/models/{model_code}", response_model=dict)
async def delete_model(
    model_code: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete a model (admin only)"""
    token = credentials.credentials
    
    if not verify_admin_token(token):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    try:
        # Check if model exists
        existing_model = crud.get_model(db, model_code)
        if not existing_model:
            raise HTTPException(
                status_code=404,
                detail=f"Model '{model_code}' not found"
            )
        
        # Check if model is being used by any captions
        from ..models import Captions
        caption_count = db.query(Captions).filter(Captions.model == model_code).count()
        if caption_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete model '{model_code}' - it is used by {caption_count} caption(s)"
            )
        
        # Hard delete model (remove from database)
        crud.delete_model(db, model_code)
        
        return {
            "message": f"Model '{model_code}' deleted successfully from database"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete model: {str(e)}"
        )
