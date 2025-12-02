import json
from datetime import datetime
from typing import Any, Dict

import duckdb
from temporalio import activity

from app.db.database import SessionLocal
from app.models.models import WorkflowExecutionStep


@activity.defn
async def fetch_source_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    db = SessionLocal()
    step = None
    try:
        execution_id = payload.get("execution_id")
        source_type = payload.get("source_type")
        source_config = payload.get("source_config")
        step = WorkflowExecutionStep(
            execution_id=execution_id,
            step_number=1,
            step_name="fetch_source",
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(step)
        db.commit()
        db.refresh(step)

        result: Dict[str, Any] = {"data": [], "row_count": 0, "files": []}

        if source_type == "none":
            result = {"data": [], "row_count": 0, "message": "No source configured"}
        elif source_type == "file":
            # Load files from MinIO
            config = json.loads(source_config or "{}")
            files = config.get("files", [])
            result["files"] = files
            result["message"] = f"Configured {len(files)} file(s) for loading"
            result["row_count"] = len(files)
        elif source_type == "api":
            import aiohttp

            config = json.loads(source_config or "{}")
            url = config.get("url")
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    data = await response.json()
                    result = {"data": data, "row_count": len(data) if isinstance(data, list) else 1}
        elif source_type == "ftp":
            result = {"data": [], "row_count": 0, "message": "FTP not yet implemented"}

        step.status = "success"
        step.completed_at = datetime.utcnow()
        step.output_data = json.dumps({"row_count": result["row_count"]})
        db.commit()
        return result
    except Exception as e:
        if step is not None:
            step.status = "failed"
            step.completed_at = datetime.utcnow()
            step.error_message = str(e)
            db.commit()
        raise
    finally:
        db.close()


@activity.defn
async def transform_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    db = SessionLocal()
    step = None
    try:
        execution_id = payload.get("execution_id")
        query = payload.get("query", "")
        source_data = payload.get("source_data", {})
        step = WorkflowExecutionStep(
            execution_id=execution_id,
            step_number=2,
            step_name="transform",
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(step)
        db.commit()
        db.refresh(step)

        # Resolve per-user DuckDB database from execution -> workflow -> owner
        from app.models.models import WorkflowExecution
        ex = db.query(WorkflowExecution).filter(WorkflowExecution.id == execution_id).first()
        owner_id = ex.workflow.owner_id if ex and ex.workflow else None
        owner_username = ex.workflow.owner.username if ex and ex.workflow and ex.workflow.owner else None
        db_path = f"/data/user_{owner_id}.duckdb" if owner_id else ":memory:"

        conn = duckdb.connect(db_path)
        
        # Load files from MinIO into DuckDB tables
        files = source_data.get("files", [])
        if files:
            from app.services.minio_service import minio_service
            import tempfile
            import os
            
            bucket_name = f"user-{owner_username}" if owner_username else None
            if bucket_name:
                for file_config in files:
                    file_path = file_config.get("path")
                    table_name = file_config.get("table_name", file_path.split("/")[-1].split(".")[0])
                    file_format = file_config.get("format", "csv")
                    
                    # Download file from MinIO to temp location
                    tmp_fd, tmp_path = tempfile.mkstemp(suffix=f".{file_format}")
                    os.close(tmp_fd)
                    try:
                        minio_service.client.fget_object(bucket_name, file_path, tmp_path)
                        
                        # Load into DuckDB based on format
                        if file_format == "csv":
                            conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_csv_auto('{tmp_path}')")
                        elif file_format == "parquet":
                            conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_parquet('{tmp_path}')")
                        elif file_format == "json":
                            conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_json_auto('{tmp_path}')")
                    finally:
                        try:
                            os.remove(tmp_path)
                        except Exception:
                            pass
        
        # Load API/inline data if present
        if source_data.get("data"):
            conn.execute("CREATE OR REPLACE TABLE source_data AS SELECT * FROM ?", [source_data["data"]])

        result = conn.execute(query).fetchall()
        columns = [desc[0] for desc in conn.description]
        transformed_data = [dict(zip(columns, row)) for row in result]
        conn.close()

        step.status = "success"
        step.completed_at = datetime.utcnow()
        step.output_data = json.dumps({"row_count": len(transformed_data)})
        db.commit()
        return {"data": transformed_data, "row_count": len(transformed_data)}
    except Exception as e:
        if step is not None:
            step.status = "failed"
            step.completed_at = datetime.utcnow()
            step.error_message = str(e)
            db.commit()
        raise
    finally:
        db.close()


@activity.defn
async def save_to_destination(payload: Dict[str, Any]) -> Dict[str, Any]:
    db = SessionLocal()
    step = None
    try:
        execution_id = payload.get("execution_id")
        dest_type = payload.get("dest_type")
        dest_config = payload.get("dest_config")
        data = payload.get("data", {})
        step = WorkflowExecutionStep(
            execution_id=execution_id,
            step_number=3,
            step_name="save_destination",
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(step)
        db.commit()
        db.refresh(step)

        result: Dict[str, Any] = {"saved": True, "row_count": data.get("row_count", 0)}

        if dest_type == "storage":
            # Save to MinIO transformed folder as CSV
            try:
                from app.models.models import WorkflowExecution
                from app.services.minio_service import minio_service
                import csv, os, tempfile, time

                ex = db.query(WorkflowExecution).filter(WorkflowExecution.id == execution_id).first()
                wf = ex.workflow if ex else None
                owner = wf.owner if wf else None
                bucket_name = f"user-{owner.username}" if owner else None

                filename = f"workflow_{wf.id if wf else 'unknown'}_{execution_id}_{int(time.time())}.csv"
                tmp_fd, tmp_path = tempfile.mkstemp(suffix=".csv")
                os.close(tmp_fd)
                try:
                    rows = data.get("data", [])
                    with open(tmp_path, "w", newline="") as f:
                        if rows:
                            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
                            writer.writeheader()
                            writer.writerows(rows)
                        else:
                            f.write("")
                    if bucket_name:
                        minio_service.client.fput_object(bucket_name, f"transformed/{filename}", tmp_path)
                        result["object"] = f"transformed/{filename}"
                        result["bucket"] = bucket_name
                        result["message"] = "Saved to MinIO"
                    else:
                        result["saved"] = False
                        result["message"] = "Owner/bucket not resolved"
                finally:
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
            except Exception as e:
                result["saved"] = False
                result["message"] = f"Storage save failed: {e}"
        elif dest_type == "webhook":
            import aiohttp

            config = json.loads(dest_config or "{}")
            url = config.get("url")
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data.get("data", [])) as response:
                    result["status_code"] = response.status
                    result["message"] = f"Posted to webhook: {response.status}"
        elif dest_type == "ftp":
            result["message"] = "FTP not yet implemented"

        step.status = "success"
        step.completed_at = datetime.utcnow()
        step.output_data = json.dumps(result)
        db.commit()
        return result
    except Exception as e:
        if step is not None:
            step.status = "failed"
            step.completed_at = datetime.utcnow()
            step.error_message = str(e)
            db.commit()
        raise
    finally:
        db.close()
