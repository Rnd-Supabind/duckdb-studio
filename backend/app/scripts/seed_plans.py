"""
Script to seed default plans.
Usage: python -m app.scripts.seed_plans
"""

import sys
import os
import json

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.billing import Plan, PlanType
from app.models.models import User, UserRole

def seed_plans():
    db = SessionLocal()
    try:
        plans_data = [
            {
                "name": "Free Tier",
                "description": "Perfect for hobbyists and testing",
                "plan_type": PlanType.FREE,
                "price_monthly": 0.0,
                "price_yearly": 0.0,
                "storage_gb": 1,
                "max_workflows": 5,
                "max_templates": 10,
                "max_transformations_per_month": 100,
                "max_files": 50,
                "is_visible": True,
                "features": ["1GB Storage", "5 Workflows", "Community Support"]
            },
            {
                "name": "Developer",
                "description": "For individual developers building apps",
                "plan_type": PlanType.DEVELOPER,
                "price_monthly": 5.0,
                "price_yearly": 50.0,
                "storage_gb": 5,
                "max_workflows": 10,
                "max_templates": 20,
                "max_transformations_per_month": 200,
                "max_files": 100,
                "is_visible": True,
                "features": ["5GB Storage", "10 Workflows", "Email Support", "API Access"]
            },
            {
                "name": "Standard",
                "description": "Great for small teams",
                "plan_type": PlanType.STANDARD,
                "price_monthly": 10.0,
                "price_yearly": 100.0,
                "storage_gb": 10,
                "max_workflows": 20,
                "max_templates": 50,
                "max_transformations_per_month": 500,
                "max_files": 200,
                "is_visible": True,
                "features": ["10GB Storage", "20 Workflows", "Priority Support", "Advanced Transformations"]
            },
            {
                "name": "Pro",
                "description": "Power users and growing businesses",
                "plan_type": PlanType.PRO,
                "price_monthly": 29.0,
                "price_yearly": 290.0,
                "storage_gb": 50,
                "max_workflows": 999999,  # Unlimited effectively
                "max_templates": 999999,
                "max_transformations_per_month": 2000,
                "max_files": 1000,
                "is_visible": True,
                "features": ["50GB Storage", "Unlimited Workflows", "24/7 Support", "Team Collaboration"]
            },
            {
                "name": "Enterprise",
                "description": "Custom solutions for large organizations",
                "plan_type": PlanType.ENTERPRISE,
                "price_monthly": 0.0,  # Contact sales
                "price_yearly": 0.0,
                "storage_gb": 1000,
                "max_workflows": 999999,
                "max_templates": 999999,
                "max_transformations_per_month": 999999,
                "max_files": 999999,
                "is_visible": True,
                "features": ["1TB Storage", "Dedicated Account Manager", "SLA", "Custom Integrations"]
            },
            {
                "name": "Admin Unlimited",
                "description": "Full system access",
                "plan_type": PlanType.ADMIN,
                "price_monthly": 0.0,
                "price_yearly": 0.0,
                "storage_gb": 999999,
                "max_workflows": 999999,
                "max_templates": 999999,
                "max_transformations_per_month": 999999,
                "max_files": 999999,
                "is_visible": False,  # Hidden from users
                "features": ["Unlimited Everything", "System Administration"]
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for plan_data in plans_data:
            existing_plan = db.query(Plan).filter(Plan.plan_type == plan_data["plan_type"]).first()
            
            if existing_plan:
                # Update existing plan
                existing_plan.name = plan_data["name"]
                existing_plan.description = plan_data["description"]
                existing_plan.price_monthly = plan_data["price_monthly"]
                existing_plan.price_yearly = plan_data["price_yearly"]
                existing_plan.storage_gb = plan_data["storage_gb"]
                existing_plan.max_workflows = plan_data["max_workflows"]
                existing_plan.max_templates = plan_data["max_templates"]
                existing_plan.max_transformations_per_month = plan_data["max_transformations_per_month"]
                existing_plan.max_files = plan_data["max_files"]
                existing_plan.is_visible = plan_data["is_visible"]
                existing_plan.features = plan_data["features"]
                updated_count += 1
                print(f"Updated plan: {plan_data['name']}")
            else:
                # Create new plan
                new_plan = Plan(**plan_data)
                db.add(new_plan)
                created_count += 1
                print(f"Created plan: {plan_data['name']}")
        
        db.commit()
        print(f"\nSummary: Created {created_count}, Updated {updated_count} plans")
        return True
        
    except Exception as e:
        print(f"Error seeding plans: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = seed_plans()
    sys.exit(0 if success else 1)
