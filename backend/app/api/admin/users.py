from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.models.models import User, UserRole
from app.models.billing import Subscription, UserQuota, Plan
from app.core.dependencies import require_admin
from app.core.config import settings
from datetime import datetime
from jose import jwt, JWTError

router = APIRouter()

class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    
    # Billing info
    plan_name: Optional[str] = None
    storage_used_bytes: Optional[int] = 0
    storage_limit_gb: Optional[int] = 0
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[UserAdminResponse])
async def list_users_admin(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all users with billing details (Admin only)"""
    query = db.query(User)
    
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) | 
            (User.email.ilike(f"%{search}%"))
        )
        
    users = query.offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "plan_name": "None",
            "storage_used_bytes": 0,
            "storage_limit_gb": 0
        }
        
        # Get active subscription
        sub = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.status == "active"
        ).first()
        
        if sub:
            user_dict["plan_name"] = sub.plan.name
            user_dict["storage_limit_gb"] = sub.plan.storage_gb
            
        # Get quota
        quota = db.query(UserQuota).filter(UserQuota.user_id == user.id).first()
        if quota:
            user_dict["storage_used_bytes"] = quota.storage_used_bytes
            
        result.append(user_dict)
        
    return result

@router.post("/{user_id}/impersonate")
async def impersonate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Generate an impersonation token for a specific user"""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent impersonating other admins (optional, but good practice)
    if target_user.role == UserRole.ADMIN and target_user.id != admin.id:
        # Allow it for now, but log it?
        pass
        
    # Create impersonation token
    # We add a special claim 'impersonator_id' to track who is impersonating
    to_encode = {
        "sub": target_user.username,
        "impersonator_id": admin.id,
        "is_impersonation": True,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return {
        "access_token": encoded_jwt,
        "token_type": "bearer",
        "impersonated_user": target_user.username
    }

from datetime import timedelta
