"""
Script to create MinIO buckets for all existing users.
Run this as a one-time migration or whenever needed.

Usage:
    python -m app.scripts.create_minio_buckets
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.models import User
from app.services.minio_service import minio_service


def create_buckets_for_all_users():
    """Create MinIO buckets for all users who don't have them."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users in database")
        
        created = 0
        skipped = 0
        failed = 0
        
        for user in users:
            bucket_name = f"user-{user.username.lower()}"
            
            # Check if bucket exists
            if minio_service.client.bucket_exists(bucket_name):
                print(f"✓ Bucket '{bucket_name}' already exists for user '{user.username}'")
                skipped += 1
                continue
            
            # Create bucket
            try:
                success = minio_service.create_user_bucket(user.username)
                if success:
                    print(f"✓ Created bucket '{bucket_name}' for user '{user.username}'")
                    created += 1
                else:
                    print(f"✗ Failed to create bucket '{bucket_name}' for user '{user.username}'")
                    failed += 1
            except Exception as e:
                print(f"✗ Error creating bucket for user '{user.username}': {e}")
                failed += 1
        
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  Created: {created}")
        print(f"  Skipped (already exists): {skipped}")
        print(f"  Failed: {failed}")
        print(f"{'='*60}")
        
        return created > 0 or skipped > 0
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("="*60)
    print("MinIO Bucket Creation Script")
    print("="*60)
    print()
    
    success = create_buckets_for_all_users()
    
    if success:
        print("\n✓ Script completed successfully")
        sys.exit(0)
    else:
        print("\n✗ Script completed with errors")
        sys.exit(1)
