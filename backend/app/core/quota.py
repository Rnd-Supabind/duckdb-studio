from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import User
from app.models.billing import UserQuota, Subscription, Plan, PlanType
from app.db.database import SessionLocal

async def check_quota(user_id: int, resource_type: str, db: Session):
    """
    Check if user has quota for a specific resource.
    resource_type: 'storage', 'workflow', 'template', 'transformation', 'file'
    """
    # Get user subscription and plan
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == 'active'
    ).first()
    
    if not subscription:
        # Fallback to free limits if no active subscription found (shouldn't happen if seeded correctly)
        # Or raise error
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No active subscription found"
        )
        
    plan = subscription.plan
    
    # Get current usage
    quota = db.query(UserQuota).filter(UserQuota.user_id == user_id).first()
    if not quota:
        # Create quota record if missing
        quota = UserQuota(user_id=user_id)
        db.add(quota)
        db.commit()
        db.refresh(quota)
        
    # Check limits based on resource type
    if resource_type == 'workflow':
        if plan.max_workflows != -1 and quota.workflows_count >= plan.max_workflows:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Workflow limit reached ({plan.max_workflows}). Upgrade your plan to create more."
            )
            
    elif resource_type == 'template':
        if plan.max_templates != -1 and quota.templates_count >= plan.max_templates:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Template limit reached ({plan.max_templates}). Upgrade your plan to create more."
            )
            
    elif resource_type == 'file':
        if plan.max_files != -1 and quota.files_count >= plan.max_files:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"File count limit reached ({plan.max_files}). Upgrade your plan to upload more."
            )

    # Storage check is usually done with specific size, so we might need a separate function or pass size here
    # For now, this function checks count-based limits

async def check_storage_quota(user_id: int, file_size_bytes: int, db: Session):
    """Check if user has enough storage space"""
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == 'active'
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=403, detail="No active subscription")
        
    plan = subscription.plan
    quota = db.query(UserQuota).filter(UserQuota.user_id == user_id).first()
    
    if not quota:
        quota = UserQuota(user_id=user_id)
        db.add(quota)
        db.commit()
    
    # Calculate limit in bytes
    limit_bytes = plan.storage_gb * 1024 * 1024 * 1024
    
    if quota.storage_used_bytes + file_size_bytes > limit_bytes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Storage limit exceeded. You have {round((limit_bytes - quota.storage_used_bytes)/1024/1024, 2)}MB remaining."
        )

async def increment_usage(user_id: int, resource_type: str, amount: int = 1, db: Session = None):
    """Increment usage counter for a resource"""
    if not db:
        db = SessionLocal()
        
    try:
        quota = db.query(UserQuota).filter(UserQuota.user_id == user_id).first()
        if not quota:
            quota = UserQuota(user_id=user_id)
            db.add(quota)
            
        if resource_type == 'workflow':
            quota.workflows_count += amount
        elif resource_type == 'template':
            quota.templates_count += amount
        elif resource_type == 'file':
            quota.files_count += amount
        elif resource_type == 'storage':
            quota.storage_used_bytes += amount
        elif resource_type == 'transformation':
            quota.transformations_this_month += amount
            
        db.commit()
    except Exception as e:
        print(f"Error incrementing usage: {e}")
        # Don't fail the operation just because usage tracking failed? 
        # Or maybe we should. For now, log and continue.
