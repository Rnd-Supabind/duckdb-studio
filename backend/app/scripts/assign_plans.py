"""
Script to assign plans to existing users.
Usage: python -m app.scripts.assign_plans
"""

import sys
import os
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.billing import Plan, PlanType, Subscription, SubscriptionStatus, BillingCycle, UserQuota
from app.models.models import User, UserRole

def assign_plans():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users")
        
        free_plan = db.query(Plan).filter(Plan.plan_type == PlanType.FREE).first()
        admin_plan = db.query(Plan).filter(Plan.plan_type == PlanType.ADMIN).first()
        
        if not free_plan or not admin_plan:
            print("Error: Plans not found. Run seed_plans.py first.")
            return False
            
        for user in users:
            # Check if user already has a subscription
            existing_sub = db.query(Subscription).filter(
                Subscription.user_id == user.id,
                Subscription.status == SubscriptionStatus.ACTIVE
            ).first()
            
            if existing_sub:
                print(f"User {user.username} already has a subscription")
                continue
                
            # Determine plan
            if user.username == "admin" or user.role == UserRole.ADMIN:
                plan = admin_plan
                print(f"Assigning ADMIN plan to {user.username}")
            else:
                plan = free_plan
                print(f"Assigning FREE plan to {user.username}")
            
            # Create subscription
            subscription = Subscription(
                user_id=user.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                billing_cycle=BillingCycle.MONTHLY,
                started_at=datetime.utcnow()
            )
            db.add(subscription)
            
            # Create quota if not exists
            quota = db.query(UserQuota).filter(UserQuota.user_id == user.id).first()
            if not quota:
                quota = UserQuota(user_id=user.id)
                db.add(quota)
                
            db.commit()
            print(f"✓ Assigned plan to {user.username}")
            
        return True
        
    except Exception as e:
        print(f"Error assigning plans: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = assign_plans()
    sys.exit(0 if success else 1)
