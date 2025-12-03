"""
Script to create a new user.
Usage: python -m app.scripts.create_user <username> <email> <password>
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.models import User, UserRole
from app.core.security import get_password_hash
from app.services.minio_service import minio_service

def create_user(username, email, password):
    db = SessionLocal()
    try:
        # Check if user exists
        existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing:
            print(f"User '{username}' or email '{email}' already exists")
            # Update password if exists
            existing.hashed_password = get_password_hash(password)
            existing.is_active = True
            db.commit()
            print(f"Updated password for existing user '{username}'")
            return True
        
        new_user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            is_active=True,
            role=UserRole.USER
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"Created user '{username}' successfully")
        
        # Create bucket
        try:
            minio_service.create_user_bucket(username)
            print(f"Created bucket for '{username}'")
        except Exception as e:
            print(f"Failed to create bucket: {e}")
            
        return True
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python -m app.scripts.create_user <username> <email> <password>")
        sys.exit(1)
    
    username = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    
    success = create_user(username, email, password)
    sys.exit(0 if success else 1)
