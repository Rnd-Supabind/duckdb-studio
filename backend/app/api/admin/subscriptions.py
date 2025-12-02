from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.models.billing import Subscription, Plan, UserQuota, SubscriptionStatus, BillingCycle
from app.models.models import User
from app.core.dependencies import require_admin
from datetime import datetime, timedelta

router = APIRouter()

# Pydantic models
class SubscriptionCreate(BaseModel):
    user_id: int
    plan_id: int
    billing_cycle: BillingCycle = BillingCycle.MONTHLY

class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan_id: int
    status: SubscriptionStatus
    billing_cycle: BillingCycle
    started_at: datetime
    expires_at: Optional[datetime]
    plan_name: str
    
    class Config:
        from_attributes = True

@router.get("/user/{user_id}", response_model=List[SubscriptionResponse])
async def get_user_subscriptions(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all subscriptions for a user"""
    subs = db.query(Subscription).filter(Subscription.user_id == user_id).all()
    
    # Enrich with plan name
    result = []
    for sub in subs:
        sub_dict = sub.__dict__
        sub_dict['plan_name'] = sub.plan.name
        result.append(sub_dict)
        
    return result

@router.post("/", response_model=SubscriptionResponse)
async def assign_plan(
    sub_data: SubscriptionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Assign a plan to a user (Create Subscription)"""
    # Check user exists
    user = db.query(User).filter(User.id == sub_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check plan exists
    plan = db.query(Plan).filter(Plan.id == sub_data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Deactivate existing active subscriptions
    active_subs = db.query(Subscription).filter(
        Subscription.user_id == sub_data.user_id,
        Subscription.status == SubscriptionStatus.ACTIVE
    ).all()
    
    for sub in active_subs:
        sub.status = SubscriptionStatus.CANCELLED
        sub.cancelled_at = datetime.utcnow()
    
    # Calculate expiry
    started_at = datetime.utcnow()
    if sub_data.billing_cycle == BillingCycle.MONTHLY:
        expires_at = started_at + timedelta(days=30)
    else:
        expires_at = started_at + timedelta(days=365)
        
    # Create new subscription
    new_sub = Subscription(
        user_id=sub_data.user_id,
        plan_id=sub_data.plan_id,
        status=SubscriptionStatus.ACTIVE,
        billing_cycle=sub_data.billing_cycle,
        started_at=started_at,
        expires_at=expires_at
    )
    
    db.add(new_sub)
    
    # Update or Create User Quota
    quota = db.query(UserQuota).filter(UserQuota.user_id == sub_data.user_id).first()
    if not quota:
        quota = UserQuota(user_id=sub_data.user_id)
        db.add(quota)
    
    # Reset usage on plan change? Maybe not, but limits will change effectively
    # quota.storage_used_bytes = 0 # Don't reset storage usage
    
    db.commit()
    db.refresh(new_sub)
    
    # Enrich response
    response = new_sub.__dict__
    response['plan_name'] = plan.name
    
    return response

@router.put("/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Cancel a subscription"""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    sub.status = SubscriptionStatus.CANCELLED
    sub.cancelled_at = datetime.utcnow()
    
    db.commit()
    return {"message": "Subscription cancelled"}
