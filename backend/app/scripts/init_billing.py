"""
Create billing tables and seed default plans

Run: docker exec dataforge-api python -m app.scripts.init_billing
"""
from app.db.database import SessionLocal, engine
from app.models.billing import Plan, PlanType, UserQuota, Subscription, ActivityLog
from app.models.models import Base, User
from datetime import datetime, timedelta

def create_billing_tables():
    """Create all billing tables"""
    print("Creating billing tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Billing tables created!")

def seed_default_plans():
    """Create default billing plans"""
    db = SessionLocal()
    
    try:
        # Check if plans already exist
        existing = db.query(Plan).first()
        if existing:
            print("Plans already exist!")
            return
        
        # Free Plan
        free_plan = Plan(
            name="Free",
            plan_type=PlanType.FREE,
            price_monthly=0.0,
            price_yearly=0.0,
            storage_gb=1,
            max_workflows=5,
            max_templates=10,
            max_transformations_per_month=100,
            max_files=50,
            is_active=True
        )
        
        # Pro Plan
        pro_plan = Plan(
            name="Pro",
            plan_type=PlanType.PRO,
            price_monthly=29.99,
            price_yearly=299.99,
            storage_gb=50,
            max_workflows=50,
            max_templates=100,
            max_transformations_per_month=10000,
            max_files=1000,
            is_active=True
        )
       
        # Enterprise Plan
        enterprise_plan = Plan(
            name="Enterprise",
            plan_type=PlanType.ENTERPRISE,
            price_monthly=99.99,
            price_yearly=999.99,
            storage_gb=500,
            max_workflows=-1,  # Unlimited
            max_templates=-1,  # Unlimited
            max_transformations_per_month=-1,  # Unlimited
            max_files=-1,  # Unlimited
            is_active=True
        )
        
        db.add_all([free_plan, pro_plan, enterprise_plan])
        db.commit()
        
        print("✅ Default plans created:")
        print(f"  - Free: $0/month")
        print(f"  - Pro: $29.99/month")
        print(f"  - Enterprise: $99.99/month")
        
    except Exception as e:
        print(f"❌ Error creating plans: {e}")
        db.rollback()
    finally:
        db.close()

def assign_free_plan_to_users():
    """Assign free plan to all existing users and create quotas"""
    db = SessionLocal()
    
    try:
        free_plan = db.query(Plan).filter(Plan.plan_type == PlanType.FREE).first()
        if not free_plan:
            print("❌ Free plan not found! Run seed_default_plans first.")
            return
        
        users = db.query(User).all()
        
        for user in users:
            # Create subscription
            existing_sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if not existing_sub:
                subscription = Subscription(
                    user_id=user.id,
                    plan_id=free_plan.id,
                    status="active",
                    billing_cycle="monthly",
                    started_at=datetime.utcnow(),
                    expires_at=None  # Free plan doesn't expire
                )
                db.add(subscription)
            
            # Create quota
            existing_quota = db.query(UserQuota).filter(UserQuota.user_id == user.id).first()
            if not existing_quota:
                quota = UserQuota(
                    user_id=user.id,
                    storage_used_bytes=0,
                    workflows_count=0,
                    templates_count=0,
                    transformations_this_month=0,
                    files_count=0
                )
                db.add(quota)
        
        db.commit()
        print(f"✅ Assigned free plan to {len(users)} users")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("="* 50)
    print("Initializing Billing System")
    print("=" * 50)
    
    create_billing_tables()
    seed_default_plans()
    assign_free_plan_to_users()
    
    print("\n✅ Billing system initialization complete!")
