from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Workflow, WorkflowExecution, AuditLog
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter()

class SystemStats(BaseModel):
    total_users: int
    total_workflows: int
    total_executions: int
    total_storage_mb: float
    executions_last_24h: int
    failed_executions_last_24h: int
    active_users_last_week: int

class TopUser(BaseModel):
    id: int
    username: str
    email: str
    workflow_count: int
    execution_count: int
    storage_mb: float

class UserDetail(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    workflow_count: int
    execution_count: int
    storage_mb: float
    last_activity: Optional[datetime]

class AdminDashboardResponse(BaseModel):
    stats: SystemStats
    top_users: List[TopUser]
    recent_executions: List[dict]

class AllUsersResponse(BaseModel):
    users: List[UserDetail]
    total: int

@router.get("/stats", response_model=AdminDashboardResponse)
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system-wide statistics (Admin only)"""
    
    # Check if user is admin
    if str(current_user.role.value).lower() != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Total users
    total_users = db.query(User).count()
    
    # Total workflows
    total_workflows = db.query(Workflow).count()
    
    # Total executions
    total_executions = db.query(WorkflowExecution).count()
    
    # Executions in last 24h
    recent_cutoff = datetime.utcnow() - timedelta(hours=24)
    executions_last_24h = db.query(WorkflowExecution).filter(
        WorkflowExecution.started_at >= recent_cutoff
    ).count()
    
    # Failed executions in last 24h
    failed_executions_last_24h = db.query(WorkflowExecution).filter(
        WorkflowExecution.started_at >= recent_cutoff,
        WorkflowExecution.status == "failed"
    ).count()
    
    # Active users in last week
    week_cutoff = datetime.utcnow() - timedelta(days=7)
    active_users_last_week = db.query(func.count(func.distinct(AuditLog.user_id))).filter(
        AuditLog.timestamp >= week_cutoff
    ).scalar()
    
    # Calculate total storage (estimate - would need MinIO aggregation for real value)
    from app.services.minio_service import minio_service
    total_storage_mb = 0.0
    
    try:
        users = db.query(User).all()
        for user in users:
            bucket_name = f"user-{user.username}"
            try:
                objects = minio_service.client.list_objects(bucket_name, recursive=True)
                for obj in objects:
                    if not obj.object_name.endswith('.keep'):
                        total_storage_mb += obj.size / (1024 * 1024)
            except Exception:
                pass
    except Exception:
        pass
    
    # Top users by workflow count
    top_users_query = db.query(
        User,
        func.count(Workflow.id).label('workflow_count')
    ).outerjoin(Workflow).group_by(User.id).order_by(desc('workflow_count')).limit(10).all()
    
    top_users = []
    for user, workflow_count in top_users_query:
        # Get execution count
        exec_count = db.query(WorkflowExecution).join(Workflow).filter(
            Workflow.owner_id == user.id
        ).count()
        
        # Get storage
        bucket_name = f"user-{user.username}"
        user_storage_mb = 0.0
        try:
            objects = minio_service.client.list_objects(bucket_name, recursive=True)
            for obj in objects:
                if not obj.object_name.endswith('.keep'):
                    user_storage_mb += obj.size / (1024 * 1024)
        except Exception:
            pass
        
        top_users.append(TopUser(
            id=user.id,
            username=user.username,
            email=user.email,
            workflow_count=workflow_count,
            execution_count=exec_count,
            storage_mb=user_storage_mb
        ))
    
    # Recent executions across all users
    recent_execs = db.query(WorkflowExecution).join(Workflow).join(User).order_by(
        desc(WorkflowExecution.started_at)
    ).limit(20).all()
    
    recent_executions = []
    for ex in recent_execs:
        recent_executions.append({
            "id": ex.id,
            "workflow_name": ex.workflow.name,
            "username": ex.workflow.owner.username,
            "status": ex.status,
            "started_at": ex.started_at.isoformat() if ex.started_at else None,
            "completed_at": ex.completed_at.isoformat() if ex.completed_at else None,
            "rows_affected": ex.rows_affected
        })
    
    stats = SystemStats(
        total_users=total_users,
        total_workflows=total_workflows,
        total_executions=total_executions,
        total_storage_mb=total_storage_mb,
        executions_last_24h=executions_last_24h,
        failed_executions_last_24h=failed_executions_last_24h,
        active_users_last_week=active_users_last_week or 0
    )
    
    return AdminDashboardResponse(
        stats=stats,
        top_users=top_users,
        recent_executions=recent_executions
    )

@router.get("/users", response_model=AllUsersResponse)
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users with their statistics (Admin only)"""
    
    # Check if user is admin
    if str(current_user.role.value).lower() != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from app.services.minio_service import minio_service
    
    users = db.query(User).all()
    user_details = []
    
    for user in users:
        # Get workflow count
        workflow_count = db.query(Workflow).filter(Workflow.owner_id == user.id).count()
        
        # Get execution count
        execution_count = db.query(WorkflowExecution).join(Workflow).filter(
            Workflow.owner_id == user.id
        ).count()
        
        # Get storage
        bucket_name = f"user-{user.username}"
        storage_mb = 0.0
        try:
            objects = minio_service.client.list_objects(bucket_name, recursive=True)
            for obj in objects:
                if not obj.object_name.endswith('.keep'):
                    storage_mb += obj.size / (1024 * 1024)
        except Exception:
            pass
        
        # Get last activity
        last_activity = db.query(AuditLog.timestamp).filter(
            AuditLog.user_id == user.id
        ).order_by(desc(AuditLog.timestamp)).first()
        
        user_details.append(UserDetail(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
            workflow_count=workflow_count,
            execution_count=execution_count,
            storage_mb=storage_mb,
            last_activity=last_activity[0] if last_activity else None
        ))
    
    return AllUsersResponse(
        users=user_details,
        total=len(user_details)
    )

@router.get("/activity", response_model=List[dict])
async def get_system_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None
):
    """Get system-wide activity log (Admin only)"""
    
    # Check if user is admin
    if str(current_user.role.value).lower() != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(AuditLog).join(User)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
    
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": log.user.username,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "timestamp": log.timestamp.isoformat(),
            "details": log.details
        })
    
    return result
