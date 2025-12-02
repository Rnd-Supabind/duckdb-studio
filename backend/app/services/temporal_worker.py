"""
Temporal Worker Service startup for ETL Workflows
Registers workflow and activities with Temporal worker
"""
import traceback
from temporalio.client import Client
from temporalio.worker import Worker
from app.services.temporal_workflow import ETLWorkflow

# Worker initialization
async def start_worker(namespace: str = "default"):
    """
    Start Temporal worker for a specific namespace
    """
    try:
        client = await Client.connect("temporal:7233", namespace=namespace)
        # Import activities lazily to avoid sandbox import of heavy deps
        from app.services import etl_activities
        
        worker = Worker(
            client,
            task_queue=f"etl-queue-{namespace}",
            workflows=[ETLWorkflow],
            activities=[
                etl_activities.fetch_source_data,
                etl_activities.transform_data,
                etl_activities.save_to_destination,
            ],
        )
        
        print(f"✓ Worker started for namespace: {namespace}, task_queue: etl-queue-{namespace}")
        await worker.run()
    except Exception as e:
        print(f"✗ Worker failed for namespace {namespace}: {e}")
        traceback.print_exc()
        raise


if __name__ == "__main__":
    import asyncio
    asyncio.run(start_worker())
