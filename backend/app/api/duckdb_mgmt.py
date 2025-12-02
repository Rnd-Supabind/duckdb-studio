from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User
import duckdb
from typing import List

router = APIRouter()

class TableInfo:
    name: str
    row_count: int

@router.get("/tables")
async def list_tables(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all tables in user's DuckDB database"""
    try:
        db_path = f"/data/user_{current_user.id}.duckdb"
        conn = duckdb.connect(db_path)
        
        # Get all tables
        tables_result = conn.execute("SHOW TABLES").fetchall()
        tables = []
        
        for table in tables_result:
            table_name = table[0]
            # Get row count
            count_result = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
            row_count = count_result[0] if count_result else 0
            
            tables.append({
                "name": table_name,
                "row_count": row_count
            })
        
        conn.close()
        return {"tables": tables}
    except Exception as e:
        return {"tables": [], "error": str(e)}

@router.delete("/tables/{table_name}")
async def drop_table(
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Drop a table from user's DuckDB database"""
    try:
        db_path = f"/data/user_{current_user.id}.duckdb"
        conn = duckdb.connect(db_path)
        conn.execute(f"DROP TABLE IF EXISTS {table_name}")
        conn.close()
        
        # Log the action
        from app.core.audit import log_action
        await log_action(
            db=db,
            user_id=current_user.id,
            action="table_dropped",
            resource_type="table",
            details={"table_name": table_name}
        )
        
        return {"message": f"Table {table_name} dropped successfully"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to drop table: {str(e)}")
