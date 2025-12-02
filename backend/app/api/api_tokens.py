from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, ApiToken
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import secrets
import hashlib

router = APIRouter()

class ApiTokenCreate(BaseModel):
    name: str

class ApiTokenResponse(BaseModel):
    id: int
    name: str
    prefix: str
    created_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True

class ApiTokenCreatedResponse(ApiTokenResponse):
    token: str  # Only returned once upon creation

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/", response_model=ApiTokenCreatedResponse)
async def create_api_token(
    token_in: ApiTokenCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new API token"""
    # Generate a secure random token
    raw_token = f"df_{secrets.token_urlsafe(32)}"
    token_hash = hash_token(raw_token)
    prefix = raw_token[:8]
    
    new_token = ApiToken(
        name=token_in.name,
        token_hash=token_hash,
        prefix=prefix,
        user_id=current_user.id
    )
    
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    
    # Return the raw token only this one time
    response = ApiTokenCreatedResponse.model_validate(new_token)
    response.token = raw_token
    return response

@router.get("/", response_model=List[ApiTokenResponse])
async def list_api_tokens(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all API tokens for the current user"""
    return db.query(ApiToken).filter(ApiToken.user_id == current_user.id).all()

@router.delete("/{token_id}")
async def revoke_api_token(
    token_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke (delete) an API token"""
    token = db.query(ApiToken).filter(
        ApiToken.id == token_id,
        ApiToken.user_id == current_user.id
    ).first()
    
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    db.delete(token)
    db.commit()
    
    return {"message": "Token revoked successfully"}
