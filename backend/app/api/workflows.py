from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.models.models import Workflow, WorkflowExecution
from app.core.audit import log_action
from datetime import datetime
from typing import List, Optional

router = APIRouter()

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    schedule: str
    query: str

class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    schedule: str
    status: str
    created_at: datetime
    last_run: Optional[datetime]
    next_run: Optional[datetime]
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all workflows for the current user"""
    user_id = 1  # TODO: Get from JWT
    workflows = db.query(Workflow).filter(
        Workflow.owner_id == user_id
    ).offset(skip).limit(limit).all()
    return workflows

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """Create a new workflow"""
    user_id = 1  # TODO: Get from JWT
    
    db_workflow = Workflow(
        name=workflow.name,
        description=workflow.description,
        schedule=workflow.schedule,
        query=workflow.query,
        owner_id=user_id,
        status="paused"
    )
    
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    
    # Log the action
    await log_action(
        db=db,
        user_id=user_id,
        action="workflow_created",
        resource_type="workflow",
        resource_id=str(db_workflow.id),
        details={"name": workflow.name}
    )
    
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
    db: Session = Depends(get_db)
):
    """Delete a workflow"""
    user_id = 1  # TODO: Get from JWT
    
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    db.delete(workflow)
    db.commit()
    
    await log_action(
        db=db,
        user_id=user_id,
        action="workflow_deleted",
        resource_type="workflow",
        resource_id=str(workflow_id)
    )
    
    return {"message": "Workflow deleted successfully"}
