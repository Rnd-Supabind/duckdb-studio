"""
Script to reset user password.
Usage: python -m app.scripts.reset_password <username> <new_password>
"""

import sys
import os
import argparse

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.models import User
from app.core.security import get_password_hash

def reset_password(username, new_password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User '{username}' not found")
            return False
        
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        print(f"Password for user '{username}' has been reset successfully")
        return True
    except Exception as e:
        print(f"Error resetting password: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m app.scripts.reset_password <username> <new_password>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    success = reset_password(username, password)
    sys.exit(0 if success else 1)
