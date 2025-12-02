from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List
from app.db.database import get_db
from app.models.models import User, UserRole
from app.core.dependencies import get_current_user, require_admin
from app.core.security import get_password_hash, verify_password
from datetime import datetime

router = APIRouter()

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    storage_used_bytes: int = 0
    storage_limit_gb: int = 1
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: EmailStr

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current authenticated user's profile"""
    # Get storage usage if quota exists
    storage_used_bytes = 0
    try:
        from app.models.billing import UserQuota
        quota = db.query(UserQuota).filter(UserQuota.user_id == current_user.id).first()
        if quota:
            storage_used_bytes = quota.storage_used_bytes
    except Exception as e:
        print(f"Warning: Could not fetch user quota: {e}")
    
    # Get storage limit from active subscription
    storage_limit_gb = 1  # Default fallback
    try:
        from app.models.billing import Subscription, SubscriptionStatus
        active_sub = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.ACTIVE
        ).first()
        if active_sub and active_sub.plan:
            storage_limit_gb = active_sub.plan.storage_gb
    except Exception as e:
        print(f"Warning: Could not fetch user subscription: {e}")
    
    # Return user data with computed storage values
    response = UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        storage_used_bytes=storage_used_bytes,
        storage_limit_gb=storage_limit_gb
    )
    return response

@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's profile"""
    # Check if email is already taken by another user
    existing_user = db.query(User).filter(
        User.email == user_update.email,
        User.id != current_user.id
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    current_user.email = user_update.email
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/me/password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,
    role: UserRole,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a user's role (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return {"message": f"User role updated to {role.value}"}

@router.put("/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = is_active
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"User {'activated' if is_active else 'deactivated'}"}
