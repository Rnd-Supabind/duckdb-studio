from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User
from app.models.billing import Plan, Subscription, BillingCycle, SubscriptionStatus, PlanType

router = APIRouter()


class PlanIn(BaseModel):
    name: str
    plan_type: PlanType
    price_monthly: float = 0.0
    price_yearly: float = 0.0
    storage_gb: int = 1
    max_workflows: int = 5
    max_templates: int = 10
    max_transformations_per_month: int = 100
    max_files: int = 50
    is_active: bool = True


class PlanOut(PlanIn):
    id: int

    class Config:
        from_attributes = True


def _ensure_admin(user: User):
    if str(user.role.value).lower() != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/plans/", response_model=List[PlanOut])
async def list_plans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_admin(current_user)
    return db.query(Plan).order_by(Plan.id).all()


@router.post("/plans/", response_model=PlanOut)
async def create_plan(body: PlanIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_admin(current_user)
    exists = db.query(Plan).filter(Plan.name == body.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="Plan name already exists")
    plan = Plan(**body.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/plans/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: int, body: PlanIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_admin(current_user)
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for k, v in body.dict().items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_admin(current_user)
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Plan deleted"}


class AssignSubscriptionIn(BaseModel):
    plan_id: int
    billing_cycle: BillingCycle = BillingCycle.MONTHLY


@router.get("/users/{user_id}/subscription")
async def get_user_subscription(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_admin(current_user)
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        return {"subscription": None}
    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "plan_id": sub.plan_id,
        "status": sub.status.value,
        "billing_cycle": sub.billing_cycle.value,
        "started_at": sub.started_at.isoformat() if sub.started_at else None,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
    }


@router.post("/users/{user_id}/subscription")
async def assign_user_subscription(user_id: int, body: AssignSubscriptionIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    plan = db.query(Plan).filter(Plan.id == body.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        sub = Subscription(
            user_id=user_id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            billing_cycle=body.billing_cycle,
            started_at=datetime.utcnow(),
        )
        db.add(sub)
    else:
        sub.plan_id = plan.id
        sub.billing_cycle = body.billing_cycle
        sub.status = SubscriptionStatus.ACTIVE

    # Optionally set expires_at depending on cycle
    if body.billing_cycle == BillingCycle.MONTHLY:
        sub.expires_at = datetime.utcnow() + timedelta(days=30)
    else:
        sub.expires_at = datetime.utcnow() + timedelta(days=365)

    db.commit()
    db.refresh(sub)
    return {"message": "Subscription updated"}


@router.post("/users/{user_id}/subscription/cancel")
async def cancel_subscription(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_admin(current_user)
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")
    sub.status = SubscriptionStatus.CANCELLED
    sub.cancelled_at = datetime.utcnow()
    db.commit()
    return {"message": "Subscription cancelled"}
