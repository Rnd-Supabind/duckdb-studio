from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import Workflow, WorkflowExecution
from app.core.audit import log_action_sync
import duckdb
import json
import logging
import aiohttp
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def execute_workflow(workflow_id: int):
    """Execute a single workflow"""
    db = SessionLocal()
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            return

        # Create execution record
        execution = WorkflowExecution(
            workflow_id=workflow.id,
            status="running",
            started_at=datetime.utcnow()
        )
        db.add(execution)
        db.commit()

        logger.info(f"Starting workflow execution {workflow.id}")

        # 1. Handle Source
        # For now, we'll assume data is already loaded or we are just running a transformation on existing tables
        # TODO: Implement FTP/API source fetching
        
        # 2. Execute Query
        db_path = f"/data/user_{workflow.owner_id}.duckdb"
        conn = duckdb.connect(db_path)
        
        query_to_run = workflow.query
        if workflow.template_id and workflow.template:
            query_to_run = workflow.template.query
            
        if not query_to_run:
            raise Exception("No query or template defined")

        # Create a temp table for results if we need to export
        result_filename = f"workflow_{workflow.id}_{int(datetime.now().timestamp())}.csv"
        temp_file = f"/tmp/{result_filename}"
        
        conn.execute(f"COPY ({query_to_run}) TO '{temp_file}' (HEADER, DELIMITER ',')")
        conn.close()
        
        # 3. Handle Destination
        if workflow.destination_type == "storage":
            # Save to MinIO transformed folder
            from app.services.minio import minio_service
            bucket_name = f"user-{workflow.owner.username}"
            object_name = f"transformed/{result_filename}"
            minio_service.client.fput_object(bucket_name, object_name, temp_file)
            
        elif workflow.destination_type == "webhook":
            # Post to webhook
            if workflow.destination_config:
                config = json.loads(workflow.destination_config)
                url = config.get("url")
                if url:
                    async with aiohttp.ClientSession() as session:
                        # Read file content
                        with open(temp_file, "r") as f:
                            content = f.read()
                        await session.post(url, data=content)

        # Cleanup
        import os
        if os.path.exists(temp_file):
            os.remove(temp_file)

        # Update execution status
        execution.status = "success"
        execution.completed_at = datetime.utcnow()
        workflow.last_run = datetime.utcnow()
        
        db.commit()
        logger.info(f"Workflow {workflow.id} completed successfully")

    except Exception as e:
        logger.error(f"Workflow {workflow_id} failed: {str(e)}")
        if 'execution' in locals():
            execution.status = "failed"
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

def start_scheduler():
    """Start the scheduler and load active workflows"""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")
        
        # Load active workflows
        db = SessionLocal()
        workflows = db.query(Workflow).filter(Workflow.status == "active").all()
        for wf in workflows:
            if wf.schedule:
                try:
                    scheduler.add_job(
                        execute_workflow,
                        CronTrigger.from_crontab(wf.schedule),
                        id=str(wf.id),
                        args=[wf.id],
                        replace_existing=True
                    )
                    logger.info(f"Scheduled workflow {wf.id} with cron {wf.schedule}")
                except Exception as e:
                    logger.error(f"Failed to schedule workflow {wf.id}: {e}")
        db.close()
