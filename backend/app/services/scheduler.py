"""
Workflow Scheduler Service
Manages cron-based scheduling of workflows using Temporal with synchronous fallback
"""
import asyncio
import json
import duckdb
import aiohttp
from croniter import croniter
from datetime import datetime, timedelta
from typing import Dict, Optional
from temporalio.client import Client
from app.services.temporal_utils import ensure_namespace, namespace_for_user
from app.models.models import User
from sqlalchemy.orm import Session
from app.services.temporal_workflow import ETLWorkflow
from app.db.database import SessionLocal
from app.models.models import Workflow, WorkflowExecution, QueryTemplate
import logging

logger = logging.getLogger(__name__)


class WorkflowScheduler:
    """
    Manages workflow scheduling with cron expressions
    """
    
    def __init__(self):
        self.running_schedules: Dict[int, asyncio.Task] = {}
        self.temporal_client: Optional[Client] = None
    
    async def initialize(self):
        """Initialize Temporal client"""
        try:
            self.temporal_client = await Client.connect(
                "temporal:7233",
                namespace="default"
            )
            logger.info("Workflow scheduler initialized with Temporal")
        except Exception as e:
            logger.error(f"Failed to connect to Temporal: {e}")
            logger.warning("Workflow scheduler running in degraded mode - Temporal unavailable")
            self.temporal_client = None
    
    async def schedule_workflow(self, workflow_id: int, cron: str, user_id: int):
        """
        Schedule a workflow with cron expression
        
        Args:
            workflow_id: Database workflow ID
            cron: Cron expression (e.g., "0 0 * * *")
            user_id: User ID for namespace isolation
        """
        if workflow_id in self.running_schedules:
            # Cancel existing schedule
            await self.cancel_schedule(workflow_id)
        
        # Build a readable per-user namespace
        try:
            db_local = SessionLocal()
            u = db_local.query(User).filter(User.id == user_id).first()
            namespace = namespace_for_user(username=u.username if u else None, email=u.email if u else None, fallback_id=user_id)
        finally:
            try:
                db_local.close()
            except Exception:
                pass
        
        # Ensure Temporal client is available
        if not self.temporal_client:
            logger.error(f"Cannot schedule workflow {workflow_id}: Temporal client not available")
            return
        
        # Ensure namespace exists
        ok = await ensure_namespace(namespace)
        if not ok:
            logger.warning(f"Could not ensure Temporal namespace '{namespace}' exists")
        
        # Start schedule task
        task = asyncio.create_task(
            self._run_schedule(workflow_id, cron, namespace)
        )
        self.running_schedules[workflow_id] = task
        logger.info(f"Scheduled workflow {workflow_id} with cron '{cron}' in namespace {namespace}")
    
    async def cancel_schedule(self, workflow_id: int):
        """Cancel a scheduled workflow"""
        if workflow_id in self.running_schedules:
            task = self.running_schedules[workflow_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self.running_schedules[workflow_id]
            logger.info(f"Cancelled schedule for workflow {workflow_id}")

    async def cancel_running_executions(self, workflow_id: int, user_id: int):
        """Cancel running Temporal executions for a workflow and mark them failed-cancelled"""
        db = SessionLocal()
        try:
            # Build namespace from user for Temporal cancellation
            try:
                u = db.query(User).filter(User.id == user_id).first()
                namespace = namespace_for_user(username=u.username if u else None, email=u.email if u else None, fallback_id=user_id)
            except Exception:
                namespace = "default"

            running = db.query(WorkflowExecution).filter(
                WorkflowExecution.workflow_id == workflow_id,
                WorkflowExecution.status == "running"
            ).all()

            if not running:
                return

            # Use a namespace-scoped client
            client_ns = None
            try:
                client_ns = await Client.connect("temporal:7233", namespace=namespace)
            except Exception as e:
                logger.warning(f"Could not connect to Temporal namespace {namespace} for cancellation: {e}")

            for ex in running:
                try:
                    if client_ns and ex.temporal_workflow_id:
                        handle = client_ns.get_workflow_handle(ex.temporal_workflow_id)
                        await handle.cancel()
                except Exception as e:
                    logger.warning(f"Failed to cancel Temporal workflow {ex.temporal_workflow_id}: {e}")
                finally:
                    ex.status = "failed"
                    ex.error_message = "cancelled by user"
                    ex.completed_at = datetime.utcnow()
                    db.add(ex)
            db.commit()
        finally:
            db.close()
    
    async def _run_schedule(self, workflow_id: int, cron: str, namespace: str):
        """
        Run workflow on cron schedule
        
        Args:
            workflow_id: Database workflow ID
            cron: Cron expression
            namespace: Temporal namespace
        """
        cron_iter = croniter(cron, datetime.utcnow())
        
        while True:
            try:
                # Calculate next run time
                next_run = cron_iter.get_next(datetime)
                wait_seconds = (next_run - datetime.utcnow()).total_seconds()
                
                if wait_seconds > 0:
                    await asyncio.sleep(wait_seconds)
                
                # Trigger workflow execution
                await self._execute_workflow(workflow_id, namespace)
                
            except asyncio.CancelledError:
                logger.info(f"Schedule cancelled for workflow {workflow_id}")
                break
            except Exception as e:
                logger.error(f"Error in schedule for workflow {workflow_id}: {e}")
                # Wait a bit before retrying
                await asyncio.sleep(60)
    
    async def _execute_workflow(self, workflow_id: int, namespace: str):
        """
        Execute a workflow via Temporal or synchronously as fallback
        
        Args:
            workflow_id: Database workflow ID
            namespace: Temporal namespace (for Temporal mode)
        """
        db = SessionLocal()
        execution = None
        try:
            # Get workflow config from database
            workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if not workflow or workflow.status != "active":
                logger.warning(f"Workflow {workflow_id} not found or not active")
                return
            
            # Create execution record
            execution = WorkflowExecution(
                workflow_id=workflow.id,
                status="running",
                started_at=datetime.utcnow()
            )
            db.add(execution)
            db.commit()
            db.refresh(execution)
            
            # Try Temporal first, fall back to synchronous execution
            if self.temporal_client:
                await self._execute_via_temporal(workflow, execution, namespace, db)
            else:
                await self._execute_synchronously(workflow, execution, db)
            
        except Exception as e:
            logger.error(f"Error executing workflow {workflow_id}: {e}")
            if execution:
                execution.status = "failed"
                execution.error_message = str(e)
                execution.completed_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
    
    async def _execute_via_temporal(self, workflow, execution, namespace: str, db: Session):
        """Execute workflow via Temporal"""
        try:
            # Resolve query from template if provided
            query_to_run = (workflow.query or "")
            if workflow.template_id:
                try:
                    tpl = db.query(QueryTemplate).filter(QueryTemplate.id == workflow.template_id).first()
                    if tpl and tpl.query:
                        query_to_run = tpl.query
                except Exception:
                    pass

            config = {
                "source_type": workflow.source_type or "none",
                "source_config": workflow.source_config or "{}",
                "query": query_to_run,
                "destination_type": workflow.destination_type or "storage",
                "destination_config": workflow.destination_config or "{}"
            }
            
            # Start Temporal workflow
            temporal_workflow_id = f"workflow-{workflow.id}-{int(datetime.utcnow().timestamp())}"
            
            # Use a namespace-scoped client
            client_ns = await Client.connect("temporal:7233", namespace=namespace)
            handle = await client_ns.start_workflow(
                ETLWorkflow.run,
                args=[workflow.id, execution.id, config],
                id=temporal_workflow_id,
                task_queue=f"etl-queue-{namespace}",
            )
            
            # Update execution with Temporal IDs
            execution.temporal_workflow_id = temporal_workflow_id
            try:
                execution.temporal_run_id = getattr(handle, "run_id", None)
            except Exception:
                execution.temporal_run_id = None
            
            # Update workflow last_run
            workflow.last_run = execution.started_at
            db.commit()
            
            logger.info(f"Started Temporal workflow execution {execution.id} for workflow {workflow.id} in namespace {namespace}, handle id={getattr(handle, 'id', None)}")
            
            # Wait for completion (in background)
            asyncio.create_task(self._wait_for_completion(execution.id, handle))
            
        except Exception as e:
            logger.error(f"Failed to execute via Temporal: {e}, falling back to synchronous execution")
            await self._execute_synchronously(workflow, execution, db)
    
    async def _execute_synchronously(self, workflow, execution, db: Session):
        """Execute workflow synchronously as fallback"""
        try:
            logger.info(f"Executing workflow {workflow.id} synchronously (Temporal unavailable)")
            
            # Execute query directly using DuckDB
            db_path = f"/data/user_{workflow.owner_id}.duckdb"
            conn = duckdb.connect(db_path)
            
            # Resolve query from template if provided
            query_to_run = (workflow.query or "")
            if workflow.template_id:
                try:
                    tpl = db.query(QueryTemplate).filter(QueryTemplate.id == workflow.template_id).first()
                    if tpl and tpl.query:
                        query_to_run = tpl.query
                except Exception:
                    pass
                
            if not query_to_run:
                raise Exception("No query or template defined")
            
            # Create a temp table for results if we need to export
            result_filename = f"workflow_{workflow.id}_{int(datetime.now().timestamp())}.csv"
            temp_file = f"/tmp/{result_filename}"
            
            conn.execute(f"COPY ({query_to_run}) TO '{temp_file}' (HEADER, DELIMITER ',')")
            conn.close()
            
            # Handle destination
            if workflow.destination_type == "storage":
                # Save to MinIO transformed folder
                try:
                    from app.services.minio_service import minio_service
                    bucket_name = f"user-{workflow.owner.username}"
                    object_name = f"transformed/{result_filename}"
                    minio_service.client.fput_object(bucket_name, object_name, temp_file)
                except Exception as e:
                    logger.warning(f"Could not save to MinIO: {e}")
            
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
            logger.info(f"Workflow {workflow.id} completed successfully (synchronous execution)")
            
        except Exception as e:
            logger.error(f"Synchronous workflow execution failed for {workflow.id}: {e}")
            execution.status = "failed"
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            db.commit()
    
    async def _wait_for_completion(self, execution_id: int, handle):
        """
        Wait for workflow completion and update database
        
        Args:
            execution_id: Database execution ID
            handle: Temporal workflow handle
        """
        db = SessionLocal()
        try:
            result = await handle.result()
            
            # Update execution as success
            execution = db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).first()
            
            if execution:
                execution.status = "success"
                execution.completed_at = datetime.utcnow()
                execution.rows_affected = result.get("rows_processed", 0)
                db.commit()
                
            logger.info(f"Workflow execution {execution_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Workflow execution {execution_id} failed: {e}")
            
            execution = db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).first()
            
            if execution:
                execution.status = "failed"
                execution.error_message = str(e)
                execution.completed_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
    
    async def load_active_workflows(self):
        """
        Load and schedule all active workflows from database
        """
        db = SessionLocal()
        try:
            workflows = db.query(Workflow).filter(Workflow.status == "active").all()
            
            for workflow in workflows:
                await self.schedule_workflow(
                    workflow.id,
                    workflow.schedule,
                    workflow.owner_id
                )
            
            logger.info(f"Loaded {len(workflows)} active workflows")
            
        finally:
            db.close()


# Global scheduler instance
scheduler = WorkflowScheduler()
