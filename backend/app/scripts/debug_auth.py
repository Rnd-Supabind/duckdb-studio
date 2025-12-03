"""
Script to debug password verification.
Usage: python -m app.scripts.debug_auth <username> <password>
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.models import User
from app.core.security import verify_password, get_password_hash

def debug_auth(username, password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User '{username}' not found in DB")
            return
        
        print(f"User found: {user.username}")
        print(f"Stored hash: {user.hashed_password}")
        print(f"Input password: {password}")
        
        # Test verification
        is_valid = verify_password(password, user.hashed_password)
        print(f"Verification result: {is_valid}")
        
        # Test hashing
        new_hash = get_password_hash(password)
        print(f"New hash of input: {new_hash}")
        print(f"Verify new hash: {verify_password(password, new_hash)}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m app.scripts.debug_auth <username> <password>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    debug_auth(username, password)
