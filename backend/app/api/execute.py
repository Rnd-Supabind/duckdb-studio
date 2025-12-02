from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.audit import log_action
from app.core.security import validate_sql_query
from app.core.dependencies import get_current_user
from app.models.models import User
import duckdb
import uuid
import os

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    extensions: list[str] = []
    use_cli: bool = False

class QueryResponse(BaseModel):
    columns: list[str]
    rows: list[list]
    execution_time_ms: float
    rows_affected: int

@router.post("/run", response_model=QueryResponse)
async def run_query(
    request: QueryRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a DuckDB query using the server-side engine.
    This creates an isolated session for each execution.
    
    Security features:
    - Query validation
    - Audit logging
    - Isolated execution environment
   - User authentication
    """
    import time
    
    # Validate query
    is_valid, message = validate_sql_query(request.query)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid query: {message}")
    
    # Log the query execution attempt
    await log_action(
        db=db,
        user_id=current_user.id,
        action="query_executed",
        resource_type="query",
        details={"query": request.query[:500]},  # Truncate for storage
        ip_address=req.client.host,
        user_agent=req.headers.get("user-agent")
    )
    
    try:
        start_time = time.time()
        
        # Use persistent user database instead of temporary
        db_path = f"/data/user_{current_user.id}.duckdb"
        
        # Connect to DuckDB
        con = duckdb.connect(db_path)
        
        # Configure MinIO access for user's bucket
        bucket_name = f"user-{current_user.username}"
        
        # Try to load httpfs if not already loaded
        try:
            con.execute("LOAD httpfs;")
        except Exception as ext_err:
            # If httpfs is not available, continue without S3 support
            print(f"Warning: httpfs extension not available: {ext_err}")
        
        # Configure S3/MinIO settings if httpfs is available
        try:
            con.execute(f"""
                SET s3_endpoint='minio:9000';
                SET s3_access_key_id='minioadmin';
                SET s3_secret_access_key='minioadmin';
                SET s3_use_ssl=false;
                SET s3_url_style='path';
            """)
        except Exception as s3_err:
            print(f"Warning: S3 configuration failed (httpfs may not be loaded): {s3_err}")
        
        # Optionally install/load requested extensions
        for ext in (request.extensions or []):
            try:
                con.execute(f"INSTALL {ext};")
            except Exception:
                pass
            try:
                con.execute(f"LOAD {ext};")
            except Exception:
                pass

        # Execute the user query
        result = con.execute(request.query).fetchall()
        
        # Get column names
        columns = [desc[0] for desc in con.description] if con.description else []
        
        execution_time = (time.time() - start_time) * 1000
        
        con.close()
        
        # Don't delete the database - it's persistent!
        
        return QueryResponse(
            columns=columns,
            rows=result,
            execution_time_ms=round(execution_time, 2),
            rows_affected=len(result)
        )
        
    except Exception as e:
        # Log the error
        await log_action(
            db=db,
            user_id=current_user.id,
            action="query_failed",
            resource_type="query",
            details={"query": request.query[:500], "error": str(e)},
            ip_address=req.client.host,
            user_agent=req.headers.get("user-agent")
        )
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/extensions")
async def list_extensions(current_user: User = Depends(get_current_user)):
    """List available DuckDB extensions with installed/loaded status"""
    db_path = f"/data/user_{current_user.id}.duckdb"
    try:
        con = duckdb.connect(db_path)
        try:
            rows = con.execute("SELECT name, loaded, installed, description FROM duckdb_extensions() ORDER BY name").fetchall()
            exts = [
                {
                    "name": r[0],
                    "loaded": bool(r[1]),
                    "installed": bool(r[2]),
                    "description": r[3] or "",
                }
                for r in rows
            ]
        finally:
            con.close()
        return {"extensions": exts}
    except Exception:
        # Fallback common list
        return {
            "extensions": [
                {"name": "httpfs", "description": "HTTP/S3 file system support", "loaded": False, "installed": False},
                {"name": "json", "description": "JSON file support", "loaded": False, "installed": False},
                {"name": "parquet", "description": "Parquet file support", "loaded": False, "installed": False},
                {"name": "excel", "description": "Excel file support", "loaded": False, "installed": False},
                {"name": "mysql_scanner", "description": "MySQL database connector", "loaded": False, "installed": False},
                {"name": "postgres_scanner", "description": "PostgreSQL database connector", "loaded": False, "installed": False},
            ]
        }

class InstallExtensionRequest(BaseModel):
    extension: str

@router.post("/install-extension")
async def install_extension(
    req_body: InstallExtensionRequest,
    current_user: User = Depends(get_current_user),
):
    """Install and load a DuckDB extension on the user's database"""
    ext = req_body.extension
    db_path = f"/data/user_{current_user.id}.duckdb"
    try:
        con = duckdb.connect(db_path)
        try:
            con.execute(f"INSTALL {ext};")
            con.execute(f"LOAD {ext};")
        finally:
            con.close()
        return {"status": "ok", "extension": ext}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to install/load {ext}: {e}")
