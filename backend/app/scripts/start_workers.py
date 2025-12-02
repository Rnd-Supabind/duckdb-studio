#!/usr/bin/env python3
"""
Temporal Worker Startup Script
Starts workers for all user namespaces
"""
import asyncio
import sys
import logging
from app.services.temporal_worker import start_worker
from app.services.temporal_utils import namespace_for_user, ensure_namespace
from app.db.database import SessionLocal
from app.models.models import User

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def start_all_workers():
    """Start workers for all user namespaces"""
    db = SessionLocal()
    try:
        logger.info("=" * 60)
        logger.info("Starting Temporal Workers")
        logger.info("=" * 60)
        
        # Start worker for default namespace
        logger.info("Starting worker for default namespace...")
        default_task = asyncio.create_task(start_worker("default"))
        
        # Get all users and start workers for their namespaces
        try:
            users = db.query(User).all()
            logger.info(f"Found {len(users)} users, creating workers for their namespaces...")
            
            tasks = [default_task]
            for user in users:
                namespace = namespace_for_user(username=user.username, email=user.email, fallback_id=user.id)
                # Ensure namespace exists before starting worker
                ok = await ensure_namespace(namespace)
                if not ok:
                    logger.warning(f"Could not ensure namespace '{namespace}' exists; worker may fail")
                logger.info(f"Starting worker for namespace: {namespace} (user: {user.username})")
                task = asyncio.create_task(start_worker(namespace))
                tasks.append(task)
            
            # Wait for all workers (they run in parallel)
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check for errors
            error_count = 0
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Worker {i} failed with exception: {result}")
                    error_count += 1
            
            if error_count > 0:
                logger.warning(f"{error_count} worker(s) had startup errors")
                
        except Exception as e:
            logger.error(f"Error loading users or starting workers: {e}", exc_info=True)
            # Still run default namespace
            await default_task
        
    except Exception as e:
        logger.error(f"Fatal error in worker startup: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Temporal Worker Service")
    logger.info("=" * 60)
    try:
        asyncio.run(start_all_workers())
    except KeyboardInterrupt:
        logger.info("Worker shutdown requested")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Worker failed: {e}", exc_info=True)
        sys.exit(1)
