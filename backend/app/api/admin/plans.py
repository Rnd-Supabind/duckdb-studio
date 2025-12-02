from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.db.database import get_db
from app.models.billing import Plan, PlanType
from app.models.models import User
from app.core.dependencies import require_admin
from datetime import datetime

router = APIRouter()

# Pydantic models
class PlanBase(BaseModel):
    name: str
    plan_type: PlanType
    price_monthly: float
    price_yearly: float
    storage_gb: int
    max_workflows: int
    max_templates: int
    max_transformations_per_month: int
    max_files: int
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanUpdate(PlanBase):
    pass

class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[PlanResponse])
async def list_plans(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all billing plans"""
    return db.query(Plan).all()

@router.post("/", response_model=PlanResponse)
async def create_plan(
    plan: PlanCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create a new billing plan"""
    # Check if plan with name exists
    existing = db.query(Plan).filter(Plan.name == plan.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plan with this name already exists")
    
    db_plan = Plan(**plan.dict())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get a specific plan"""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@router.put("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: int,
    plan_update: PlanUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update a billing plan"""
    db_plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check name uniqueness if changed
    if plan_update.name != db_plan.name:
        existing = db.query(Plan).filter(Plan.name == plan_update.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Plan with this name already exists")
    
    for key, value in plan_update.dict().items():
        setattr(db_plan, key, value)
    
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a billing plan (soft delete preferred usually, but hard delete here if no subs)"""
    db_plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check if any subscriptions use this plan
    if db_plan.subscriptions:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete plan with active subscriptions. Archive it instead."
        )
    
    db.delete(db_plan)
    db.commit()
    return {"message": "Plan deleted successfully"}
