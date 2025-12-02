"""
Seed script to create admin user

Run: python -m app.scripts.seed_admin
"""
from app.db.database import SessionLocal
from app.models.models import User, UserRole
from app.core.security import get_password_hash

def create_admin_user():
    db = SessionLocal()
    
    try:
        # Check if admin exists
        existing_admin = db.query(User).filter(User.username == "admin").first()
        
        if existing_admin:
            print("Admin user already exists!")
            print(f"Username: admin")
            print("If you forgot the password, delete this user from the database first.")
            return
        
        # Create admin user
        admin = User(
            username="admin",
            email="admin@dataforge.com",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        
        print("✅ Admin user created successfully!")
        print("=" * 50)
        print("Username: admin")
        print("Password: admin123")
        print("=" * 50)
        print("\nYou can now login at http://localhost:5173/login")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
