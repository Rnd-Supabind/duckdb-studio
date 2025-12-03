from datetime import timedelta
from typing import Any, Dict

from temporalio import workflow


@workflow.defn
class ETLWorkflow:
    """Main ETL Workflow with minimal imports for sandbox validation"""

    @workflow.run
    async def run(self, workflow_id: int, execution_id: int, config: Dict[str, Any]) -> Dict[str, Any]:
        from temporalio.common import RetryPolicy
        
        # Define retry policy with max 3 attempts
        retry_policy = RetryPolicy(
            maximum_attempts=3,
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=10),
            backoff_coefficient=2.0,
        )
        
        source_data = await workflow.execute_activity(
            "fetch_source_data",
            args=[{
                "execution_id": execution_id,
                "source_type": config.get("source_type", "none"),
                "source_config": config.get("source_config", "{}"),
            }],
            start_to_close_timeout=timedelta(minutes=10),
            retry_policy=retry_policy,
        )

        transformed_data = await workflow.execute_activity(
            "transform_data",
            args=[{
                "execution_id": execution_id,
                "query": config.get("query", ""),
                "source_data": source_data,
            }],
            start_to_close_timeout=timedelta(minutes=30),
            retry_policy=retry_policy,
        )

        save_result = await workflow.execute_activity(
            "save_to_destination",
            args=[{
                "execution_id": execution_id,
                "dest_type": config.get("destination_type", "storage"),
                "dest_config": config.get("destination_config", "{}"),
                "data": transformed_data,
            }],
            start_to_close_timeout=timedelta(minutes=10),
            retry_policy=retry_policy,
        )

        return {
            "status": "success",
            "rows_processed": transformed_data.get("row_count", 0),
            "save_result": save_result,
        }
