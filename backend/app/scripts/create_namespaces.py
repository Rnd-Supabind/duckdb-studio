#!/usr/bin/env python3
import asyncio
import logging

from app.db.database import SessionLocal
from app.models.models import User
from app.services.temporal_utils import ensure_namespace

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def main():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        logger.info(f"Found {len(users)} users")
        for user in users:
            ns = f"user-{user.id}"
            ok = await ensure_namespace(ns)
            if ok:
                logger.info(f"Ensured namespace: {ns}")
            else:
                logger.warning(f"Failed to ensure namespace: {ns}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
