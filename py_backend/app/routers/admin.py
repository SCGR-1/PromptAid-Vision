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
