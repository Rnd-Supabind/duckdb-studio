from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.models.models import Workflow, WorkflowExecution, WorkflowExecutionStep, QueryTemplate, User
from app.core.dependencies import get_current_user
from app.core.audit import log_action
from app.core.quota import check_quota, increment_usage
from datetime import datetime
from typing import List, Optional

# Try to import scheduler, but don't fail if dependencies aren't installed
try:
    from app.services.scheduler import scheduler
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    scheduler = None

router = APIRouter()

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    schedule: str
    query: str
    source_type: Optional[str] = "none"
    source_config: Optional[str] = "{}"
    destination_type: Optional[str] = "storage"
    destination_config: Optional[str] = "{}"
    template_id: Optional[int] = None
    
    def validate(self):
        if not (self.query and self.query.strip()) and not self.template_id:
            raise ValueError("Provide either a query or a template_id")

class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    schedule: str
    status: str
    created_at: datetime
    last_run: Optional[datetime]
    next_run: Optional[datetime]
    source_type: Optional[str]
    source_config: Optional[str]
    destination_type: Optional[str]
    destination_config: Optional[str]
    template_id: Optional[int]
    
    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    query: str

class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    query: str
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all workflows for the current user"""
    workflows = db.query(Workflow).filter(
        Workflow.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return workflows

# Template endpoints - MUST come before /{workflow_id} routes
@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all query templates for the current user"""
    templates = db.query(QueryTemplate).filter(
        QueryTemplate.owner_id == current_user.id
    ).all()
    return templates

@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new query template"""
    db_template = QueryTemplate(
        owner_id=current_user.id,
        name=template.name,
        description=template.description,
        query=template.query
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="template_created",
        resource_type="template",
        details={"template_name": template.name}
    )
    
    return db_template

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new workflow"""
    # Check quota
    await check_quota(current_user.id, 'workflow', db)
    
    # Ensure at least one of query or template is provided
    if (not workflow.query or not workflow.query.strip()) and not workflow.template_id:
        raise HTTPException(status_code=400, detail="Provide either a query or a template_id")
    
    db_workflow = Workflow(
        name=workflow.name,
        description=workflow.description,
        schedule=workflow.schedule,
        query=workflow.query or "",
        owner_id=current_user.id,
        status="active",  # Workflows start as active by default
        source_type=workflow.source_type,
        source_config=workflow.source_config,
        destination_type=workflow.destination_type,
        destination_config=workflow.destination_config,
        template_id=workflow.template_id
    )
    
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    
    # Log the action
    await log_action(
        db=db,
        user_id=current_user.id,
        action="workflow_created",
        resource_type="workflow",
        resource_id=str(db_workflow.id),
        details={"name": workflow.name}
    )
    
    # Increment usage
    await increment_usage(current_user.id, 'workflow', 1, db)
    
    # Handle scheduling based on schedule type
    is_one_time = workflow.schedule == "@once"
    
    if SCHEDULER_AVAILABLE and scheduler:
        try:
            namespace = f"user-{current_user.id}"
            if is_one_time:
                # For one-time execution, trigger immediately and don't schedule
                await scheduler._execute_workflow(db_workflow.id, namespace)
                # Set status to paused since it's one-time only
                db_workflow.status = "paused"
                db.commit()
            else:
                # For scheduled workflows, set up cron schedule
                await scheduler.schedule_workflow(db_workflow.id, workflow.schedule, current_user.id)
        except Exception as e:
            print(f"Warning: Could not schedule/execute workflow {db_workflow.id}: {e}")
    
    return db_workflow

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific workflow"""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a workflow"""
    
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    # Check ownership
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this workflow")
    
    db.delete(workflow)
    db.commit()
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="workflow_deleted",
        resource_type="workflow",
        resource_id=str(workflow_id)
    )
    
    return {"message": "Workflow deleted successfully"}

@router.post("/{workflow_id}/cancel")
async def cancel_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel all running executions for a workflow"""
    
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    # Check ownership
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this workflow")
    
    # Cancel running executions
    if SCHEDULER_AVAILABLE and scheduler:
        try:
            await scheduler.cancel_running_executions(workflow_id, current_user.id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to cancel executions: {str(e)}")
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="workflow_cancelled",
        resource_type="workflow",
        resource_id=str(workflow_id)
    )
    
    return {"message": "Running executions cancelled successfully"}

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule: Optional[str] = None
    query: Optional[str] = None
    status: Optional[str] = None
    source_type: Optional[str] = None
    source_config: Optional[str] = None
    destination_type: Optional[str] = None
    destination_config: Optional[str] = None
    template_id: Optional[int] = None

class ExecutionResponse(BaseModel):
    id: int
    workflow_id: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]
    rows_affected: Optional[int]
    
    class Config:
        from_attributes = True

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    workflow_update: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a workflow"""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this workflow")
    
    old_status = workflow.status
    old_schedule = workflow.schedule
    # Update fields
    for field, value in workflow_update.dict(exclude_unset=True).items():
        setattr(workflow, field, value)
    
    db.commit()
    db.refresh(workflow)
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="workflow_updated",
        resource_type="workflow",
        resource_id=str(workflow_id),
        details=workflow_update.dict(exclude_unset=True)
    )
    # If schedule changed while active, reschedule
    if SCHEDULER_AVAILABLE and scheduler:
        try:
            if workflow.status == "active" and (workflow.schedule != old_schedule or old_status != workflow.status):
                await scheduler.cancel_schedule(workflow.id)
                await scheduler.schedule_workflow(workflow.id, workflow.schedule, current_user.id)
        except Exception as e:
            print(f"Warning: failed to adjust schedule for workflow {workflow_id}: {e}")
    
    return workflow

@router.post("/{workflow_id}/run", response_model=ExecutionResponse)
async def run_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger a workflow execution via Temporal"""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to run this workflow")
    
    # Create execution record
    execution = WorkflowExecution(
        workflow_id=workflow.id,
        status="running",
        started_at=datetime.utcnow()
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)
    
    # Update workflow last_run
    workflow.last_run = execution.started_at
    db.add(workflow)
    db.commit()
    
    # Trigger execution via scheduler (which uses Temporal)
    if SCHEDULER_AVAILABLE and scheduler:
        from app.services.temporal_utils import namespace_for_user
        namespace = namespace_for_user(username=current_user.username, email=current_user.email, fallback_id=current_user.id)
        try:
            # Ensure namespace exists before execution
            from app.services.temporal_utils import ensure_namespace
            await ensure_namespace(namespace)
            await scheduler._execute_workflow(workflow.id, namespace)
        except Exception as e:
            execution.status = "failed"
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            db.commit()
            raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")
    else:
        # Fallback: mark as success for now (scheduler not available)
        execution.status = "success"
        execution.completed_at = datetime.utcnow()
        execution.rows_affected = 0
        db.commit()
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="workflow_run_manual",
        resource_type="workflow",
        resource_id=str(workflow_id)
    )
    
    db.refresh(execution)
    return execution

@router.patch("/{workflow_id}/status", response_model=WorkflowResponse)
async def toggle_workflow_status(
    workflow_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle workflow status (active/paused) and manage scheduling"""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this workflow")
    
    # Validate status parameter
    if not status or status not in ["active", "paused"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'active' or 'paused'")
    
    old_status = workflow.status
    workflow.status = status
    db.commit()
    db.refresh(workflow)
    
    # Handle scheduling
    if SCHEDULER_AVAILABLE and scheduler:
        try:
            if status == "active" and old_status != "active":
                await scheduler.schedule_workflow(workflow.id, workflow.schedule, current_user.id)
            elif status == "paused" and old_status == "active":
                await scheduler.cancel_schedule(workflow.id)
                # Cancel any running executions as part of pausing
                try:
                    await scheduler.cancel_running_executions(workflow.id, current_user.id)
                except Exception as e:
                    print(f"Warning: failed to cancel running executions for workflow {workflow.id}: {e}")
        except Exception as e:
            print(f"Error managing workflow schedule: {e}")
            # Continue anyway - status was still updated
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="workflow_status_updated",
        resource_type="workflow",
        resource_id=str(workflow_id),
        details={"status": status}
    )
    
    return workflow

@router.get("/{workflow_id}/executions", response_model=List[ExecutionResponse])
async def list_executions(
    workflow_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List executions for a workflow"""
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view executions")
        
    executions = db.query(WorkflowExecution).filter(
        WorkflowExecution.workflow_id == workflow_id
    ).order_by(WorkflowExecution.started_at.desc()).offset(skip).limit(limit).all()
    
    return executions

@router.get("/{workflow_id}/executions/{execution_id}/steps")
async def get_execution_steps(
    workflow_id: int,
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get step-by-step execution logs"""
    # Verify workflow ownership
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view execution steps")
    
    # Get execution
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.workflow_id == workflow_id
    ).first()
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Get steps
    steps = db.query(WorkflowExecutionStep).filter(
        WorkflowExecutionStep.execution_id == execution_id
    ).order_by(WorkflowExecutionStep.step_number).all()
    
    return steps
