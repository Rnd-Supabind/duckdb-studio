from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.audit import log_action
from app.core.security import validate_sql_query
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
    db: Session = Depends(get_db)
):
    """
    Execute a DuckDB query using the server-side engine.
    This creates an isolated session for each execution.
    
    Security features:
    - Query validation
    - Audit logging
    - Isolated execution environment
    """
    import time
    
    # Validate query
    is_valid, message = validate_sql_query(request.query)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid query: {message}")
    
    # Log the query execution attempt
    user_id = 1  # TODO: Get from JWT token
    await log_action(
        db=db,
        user_id=user_id,
        action="query_executed",
        resource_type="query",
        details={"query": request.query[:500]},  # Truncate for storage
        ip_address=req.client.host,
        user_agent=req.headers.get("user-agent")
    )
    
    try:
        start_time = time.time()
        
        # Create a unique session ID for isolation
        session_id = str(uuid.uuid4())
        db_path = f"/data/{session_id}.duckdb"
        
        # Connect to DuckDB
        con = duckdb.connect(db_path)
        
        # Install/Load extensions if requested
        for ext in request.extensions:
            try:
                con.execute(f"INSTALL {ext};")
                con.execute(f"LOAD {ext};")
            except Exception as e:
                print(f"Warning: Failed to load extension {ext}: {e}")
        
        # Execute the user query
        result = con.execute(request.query).fetchall()
        
        # Get column names
        columns = [desc[0] for desc in con.description] if con.description else []
        
        execution_time = (time.time() - start_time) * 1000
        
        con.close()
        
        # Cleanup temporary database
        if os.path.exists(db_path):
            os.remove(db_path)
        
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
            user_id=user_id,
            action="query_failed",
            resource_type="query",
            details={"query": request.query[:500], "error": str(e)},
            ip_address=req.client.host,
            user_agent=req.headers.get("user-agent")
        )
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/extensions")
async def list_extensions():
    """List available DuckDB extensions"""
    return {
        "extensions": [
            {"name": "httpfs", "description": "HTTP/S3 file system support"},
            {"name": "mysql", "description": "MySQL database connector"},
            {"name": "postgres", "description": "PostgreSQL database connector"},
            {"name": "aws", "description": "AWS services integration"},
            {"name": "json", "description": "JSON file support"},
            {"name": "parquet", "description": "Parquet file support"},
        ]
    }
