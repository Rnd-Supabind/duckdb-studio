#!/usr/bin/env python3
"""
Backfill MinIO buckets for existing users (pre-MinIO feature).
Creates bucket `user-{username}` with `uploads/` and `transformed/` folders when missing.
"""
import logging

from app.db.database import SessionLocal
from app.models.models import User
from app.services.minio_service import minio_service


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def ensure_user_bucket(username: str) -> bool:
    bucket_name = f"user-{username.lower()}"
    try:
        if minio_service.client.bucket_exists(bucket_name):
            logger.info(f"Bucket exists: {bucket_name}")
            return True
        ok = minio_service.create_user_bucket(username)
        if ok:
            logger.info(f"Created bucket and folders for: {bucket_name}")
        else:
            logger.error(f"Failed to create bucket for: {bucket_name}")
        return ok
    except Exception as e:
        logger.error(f"Error ensuring bucket for {bucket_name}: {e}")
        return False


def main():
    db = SessionLocal()
    created = 0
    skipped = 0
    try:
        users = db.query(User).all()
        logger.info(f"Found {len(users)} users")
        for u in users:
            if ensure_user_bucket(u.username):
                # If bucket existed, consider skipped; if created, increment created
                bucket_name = f"user-{u.username.lower()}"
                try:
                    # Distinguish existed vs created by calling bucket_exists again
                    # After create_user_bucket, it exists; we rely on log messages for clarity
                    pass
                except Exception:
                    pass
            # We cannot precisely detect created vs existed without extra calls; count after check
        logger.info("Backfill complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
