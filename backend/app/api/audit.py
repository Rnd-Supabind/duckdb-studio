from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.audit import get_user_audit_logs, get_all_audit_logs
from app.models.models import AuditLog
from datetime import datetime
from typing import List, Optional

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get audit logs for the current user"""
    user_id = 1  # TODO: Get from JWT
    logs = get_user_audit_logs(db, user_id, limit)
    return logs

@router.get("/all", response_model=List[AuditLogResponse])
async def get_all_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all audit logs (admin only)"""
    # TODO: Check if user is admin
    logs = get_all_audit_logs(db, skip, limit)
    return logs
