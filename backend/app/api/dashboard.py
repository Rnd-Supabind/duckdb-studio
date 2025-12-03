from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Workflow, WorkflowExecution, AuditLog, StorageConfig
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter()

class DashboardStats(BaseModel):
    total_files: int
    total_workflows: int
    total_query_executions: int
    storage_used_mb: float
    recent_queries: int
    failed_queries: int

class RecentActivity(BaseModel):
    action: str
    resource_type: str
    timestamp: datetime
    details: Optional[dict] = None

class WorkflowSummary(BaseModel):
    id: int
    name: str
    last_executed: Optional[datetime]
    execution_count: int
    status: str

class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_activity: List[RecentActivity]
    workflows: List[WorkflowSummary]
    user_info: dict

@router.get("/stats", response_model=DashboardResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard statistics for the current user"""
    
    # Get file count from audit logs (file uploads)
    file_uploads = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.action == "file_uploaded"
    ).count()
    
    # Get workflow count
    workflow_count = db.query(Workflow).filter(
        Workflow.owner_id == current_user.id
    ).count()
    
    # Get query execution count
    total_queries = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.action == "query_executed"
    ).count()
    
    # Get recent queries (last 24 hours)
    recent_cutoff = datetime.utcnow() - timedelta(hours=24)
    recent_queries = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.action == "query_executed",
        AuditLog.timestamp >= recent_cutoff
    ).count()
    
    # Get failed queries
    failed_queries = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.action == "query_failed"
    ).count()
    
    # Calculate storage (rough estimate from MinIO - would need actual MinIO API call for real size)
    storage_mb = file_uploads * 1.5  # Rough estimate
    
    # Get recent activity (last 10 actions)
    recent_activity = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(desc(AuditLog.timestamp)).limit(10).all()
    
    
    activity_list = []
    for log in recent_activity:
        # Parse details if it's a JSON string
        details = log.details
        if isinstance(details, str):
            import json
            try:
                details = json.loads(details)
            except:
                details = None
        
        activity_list.append(
            RecentActivity(
                action=log.action,
                resource_type=log.resource_type,
                timestamp=log.timestamp,
                details=details
            )
        )
    
    # Get workflow summaries with execution counts
    workflows = db.query(Workflow).filter(
        Workflow.owner_id == current_user.id
    ).all()
    
    workflow_list = []
    for wf in workflows:
        # Get execution count for this workflow
        exec_count = db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == wf.id
        ).count()
        
        # Get last execution
        last_exec = db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == wf.id
        ).order_by(desc(WorkflowExecution.started_at)).first()
        
        workflow_list.append(
            WorkflowSummary(
                id=wf.id,
                name=wf.name,
                last_executed=last_exec.started_at if last_exec else None,
                execution_count=exec_count,
                status=last_exec.status if last_exec else "never_run"
            )
        )
    
    stats = DashboardStats(
        total_files=file_uploads,
        total_workflows=workflow_count,
        total_query_executions=total_queries,
        storage_used_mb=storage_mb,
        recent_queries=recent_queries,
        failed_queries=failed_queries
    )
    
    return DashboardResponse(
        stats=stats,
        recent_activity=activity_list,
        workflows=workflow_list,
        user_info={
            "username": current_user.username,
            "email": current_user.email,
            "role": current_user.role.value,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
    )
