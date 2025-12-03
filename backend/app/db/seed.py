"""
Seed the database with initial data
"""
from app.models.models import User, UserRole
from app.db.database import SessionLocal
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    
    try:
        # Check if admin user exists
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            print("Creating admin user...")
            admin = User(
                username="admin",
                email="admin@dataforge.local",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created (username: admin, password: admin123)")
        else:
            print("ℹ️  Admin user already exists")
        
        # Create a demo user
        demo = db.query(User).filter(User.username == "demo").first()
        
        if not demo:
            print("Creating demo user...")
            demo = User(
                username="demo",
                email="demo@dataforge.local",
                hashed_password=get_password_hash("demo123"),
                role=UserRole.USER,
                is_active=True
            )
            db.add(demo)
            db.commit()
            print("✅ Demo user created (username: demo, password: demo123)")
        else:
            print("ℹ️  Demo user already exists")
            
        print("\n✅ Database seeding completed!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
