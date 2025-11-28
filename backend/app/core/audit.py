from sqlalchemy.orm import Session
from app.models.models import AuditLog
from datetime import datetime
import json

async def log_action(
    db: Session,
    user_id: int,
    action: str,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    ip_address: str = None,
    user_agent: str = None
):
    """
    Create an audit log entry for user actions.
    This is critical for SOC compliance and security monitoring.
    """
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.utcnow()
    )
    
    db.add(audit_entry)
    db.commit()
    
    return audit_entry

def get_user_audit_logs(db: Session, user_id: int, limit: int = 100):
    """Retrieve audit logs for a specific user"""
    return db.query(AuditLog).filter(
        AuditLog.user_id == user_id
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()

def get_all_audit_logs(db: Session, skip: int = 0, limit: int = 100):
    """Retrieve all audit logs (admin only)"""
    return db.query(AuditLog).order_by(
        AuditLog.timestamp.desc()
    ).offset(skip).limit(limit).all()
