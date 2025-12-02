"""
Reset admin password script

Run: python -m app.scripts.reset_admin_password
"""
from app.db.database import SessionLocal
from app.models.models import User, UserRole
from app.core.security import get_password_hash

def reset_admin_password():
    db = SessionLocal()
    
    try:
        # Find admin user
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            # Create new admin
            admin = User(
                username="admin",
                email="admin@dataforge.com",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("✅ Admin user created!")
        else:
            # Reset password
            admin.hashed_password = get_password_hash("admin123")
            admin.is_active = True
            print("✅ Admin password reset!")
        
        db.commit()
        
        print("=" * 50)
        print("Username: admin")
        print("Password: admin123")
        print("=" * 50)
        print("\nYou can now login at http://localhost:5173/login")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
