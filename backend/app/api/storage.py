from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.models.models import StorageConfig
from app.core.security import encrypt_value, decrypt_value
from app.core.dependencies import get_current_user
from app.models.models import User
from app.services.minio_service import minio_service
from app.core.audit import log_action
import boto3
from typing import Optional, List
import io
import duckdb

router = APIRouter()

class StorageConfigCreate(BaseModel):
    storage_type: str
    bucket_name: str
    region: str
    endpoint: Optional[str] = None
    access_key: str
    secret_key: str
    encryption_enabled: bool = True

class StorageConfigResponse(BaseModel):
    id: int
    storage_type: str
    bucket_name: str
    region: str
    endpoint: Optional[str]
    encryption_enabled: bool
    
    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    filename: str
    bucket: str
    path: str
    size: int
    message: str

class LoadFileRequest(BaseModel):
    filename: str
    table_name: str
    folder: str = "uploads"

from app.core.quota import check_storage_quota, increment_usage

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = "uploads",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file to user's MinIO bucket"""
    
    if folder not in ["uploads", "transformed"]:
        raise HTTPException(status_code=400, detail="Folder must be 'uploads' or 'transformed'")
    
    bucket_name = f"user-{current_user.username}"
    
    try:
        file_content = await file.read()
        file_size = len(file_content)
        
        # Check storage quota
        await check_storage_quota(current_user.id, file_size, db)
        
        object_name = f"{folder}/{file.filename}"
        
        minio_service.client.put_object(
            bucket_name,
            object_name,
            io.BytesIO(file_content),
            file_size,
            content_type=file.content_type or "application/octet-stream"
        )
        
        # Increment usage
        await increment_usage(current_user.id, 'storage', file_size, db)
        await increment_usage(current_user.id, 'file', 1, db)
        
        # Log the file upload to audit log
        from app.core.audit import log_action
        await log_action(
            db=db,
            user_id=current_user.id,
            action="file_uploaded",
            resource_type="file",
            details={"filename": file.filename, "size": file_size, "folder": folder}
        )
        
        return FileUploadResponse(
            filename=file.filename,
            bucket=bucket_name,
            path=object_name,
            size=file_size,
            message=f"File uploaded successfully to {bucket_name}/{object_name}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/files")
async def list_user_files(
    folder: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List files in user's MinIO bucket"""
    bucket_name = f"user-{current_user.username}"
    
    try:
        prefix = f"{folder}/" if folder else ""
        objects = minio_service.list_objects(bucket_name, prefix)
        
        files = []
        for obj in objects:
            if not obj.endswith('.keep'):
                files.append({
                    "name": obj.split('/')[-1],
                    "path": obj,
                    "folder": obj.split('/')[0] if '/' in obj else ""
                })
        
        return {"bucket": bucket_name, "files": files}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.post("/load-to-duckdb")
async def load_to_duckdb(
    request: LoadFileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Load a file from MinIO into user's DuckDB database with all VARCHAR columns"""
    import re
    import os
    
    bucket_name = f"user-{current_user.username}"
    object_name = f"{request.folder}/{request.filename}"
    
    # Validate table name (alphanumeric, underscore, start with letter/underscore)
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', request.table_name):
        raise HTTPException(status_code=400, detail="Invalid table name. Use only alphanumeric characters and underscores.")
    
    temp_file = None
    try:
        # Download file from MinIO to temp location
        temp_file = f"/tmp/{current_user.id}_{request.filename}"
        minio_service.client.fget_object(bucket_name, object_name, temp_file)
        
        # Verify file exists and is readable
        if not os.path.exists(temp_file) or os.path.getsize(temp_file) == 0:
            raise HTTPException(status_code=400, detail="Downloaded file is empty or unavailable")
        
        # Connect to user's DuckDB
        db_path = f"/data/user_{current_user.id}.duckdb"
        conn = duckdb.connect(db_path)
        
        # Detect file type and load accordingly
        file_ext = request.filename.lower().split('.')[-1]
        
        if file_ext in ['csv', 'tsv', 'txt']:
            # Read CSV with auto-detection but force VARCHAR for all columns
            # First, read to detect column names
            sample_df = conn.execute(f"""
                SELECT * FROM read_csv_auto('{temp_file}', 
                    sample_size=100,
                    all_varchar=true,
                    auto_detect=true
                ) LIMIT 0
            """).df()
            
            column_names = list(sample_df.columns)
            
            # Create table with all VARCHAR columns
            columns_def = ', '.join([f'"{col}" VARCHAR' for col in column_names])
            create_table_sql = f'CREATE OR REPLACE TABLE {request.table_name} ({columns_def})'
            conn.execute(create_table_sql)
            
            # Load data into table
            conn.execute(f"""
                INSERT INTO {request.table_name} 
                SELECT * FROM read_csv_auto('{temp_file}',
                    all_varchar=true,
                    auto_detect=true,
                    ignore_errors=true
                )
            """)
            
        elif file_ext == 'parquet':
            conn.execute(f"CREATE OR REPLACE TABLE {request.table_name} AS SELECT * FROM read_parquet('{temp_file}')")
            
        elif file_ext == 'json':
            conn.execute(f"CREATE OR REPLACE TABLE {request.table_name} AS SELECT * FROM read_json_auto('{temp_file}')")
        elif file_ext in ['xlsx', 'xls']:
            # Prefer DuckDB excel extension; fallback to pandas if unavailable
            try:
                conn.execute("INSTALL excel;")
            except Exception:
                pass
            try:
                conn.execute("LOAD excel;")
                conn.execute(f"CREATE OR REPLACE TABLE {request.table_name} AS SELECT * FROM read_excel('{temp_file}')")
            except Exception:
                # Fallback: pandas
                try:
                    import pandas as pd
                    df = pd.read_excel(temp_file)
                    conn.register('df_tmp_excel', df)
                    conn.execute(f"CREATE OR REPLACE TABLE {request.table_name} AS SELECT * FROM df_tmp_excel")
                    conn.unregister('df_tmp_excel')
                except Exception as ee:
                    raise HTTPException(status_code=400, detail=f"Failed to read Excel: {ee}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
        
        # Get row count
        result = conn.execute(f"SELECT COUNT(*) as count FROM {request.table_name}").fetchone()
        row_count = result[0] if result else 0
        
        # Get column info
        columns_result = conn.execute(f"DESCRIBE {request.table_name}").fetchall()
        columns = [{"name": col[0], "type": col[1]} for col in columns_result]
        
        conn.close()
        
        # Clean up temp file
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass
        
        # Log the data load action
        from app.core.audit import log_action
        await log_action(
            db=db,
            user_id=current_user.id,
            action="data_loaded",
            resource_type="table",
            details={"table_name": request.table_name, "rows": row_count, "source": request.filename}
        )
        
        return {
            "message": f"Loaded {row_count} rows into {request.table_name}",
            "rows": row_count,
            "table_name": request.table_name,
            "columns": columns
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Clean up temp file on error
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass
        
        # Provide detailed error message
        error_msg = str(e)
        if "Bad offset for central directory" in error_msg:
            error_msg = "Excel file is corrupted or not a valid Excel file"
        elif "Zip file" in error_msg:
            error_msg = "File is not a valid Excel file"
        
        raise HTTPException(status_code=400, detail=f"Failed to load file: {error_msg}")

@router.delete("/delete")
async def delete_file(
    filename: str,
    folder: str = "uploads",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a file from user's MinIO bucket and drop corresponding DuckDB table"""
    bucket_name = f"user-{current_user.username}"
    object_name = f"{folder}/{filename}"
    
    try:
        # Remove file from MinIO
        minio_service.client.remove_object(bucket_name, object_name)
        
        # Drop corresponding table from DuckDB
        table_name = filename.replace('.', '_').replace('-', '_')
        # Remove file extension
        table_name = table_name.rsplit('_', 1)[0] if '_' in table_name else table_name
        
        try:
            db_path = f"/data/user_{current_user.id}.duckdb"
            conn = duckdb.connect(db_path)
            conn.execute(f"DROP TABLE IF EXISTS {table_name}")
            conn.close()
        except Exception as e:
            # If table doesn't exist or other error, just log it but don't fail the delete
            print(f"Warning: Could not drop table {table_name}: {str(e)}")
        
        # Log the deletion
        from app.core.audit import log_action
        await log_action(
            db=db,
            user_id=current_user.id,
            action="file_deleted",
            resource_type="file",
            details={"filename": filename, "folder": folder, "table_dropped": table_name}
        )
        
        return {"message": f"File {filename} deleted successfully", "table_dropped": table_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@router.get("/download/{filename}")
async def download_file(
    filename: str,
    folder: str = "uploads",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a file from user's MinIO bucket"""
    from fastapi.responses import StreamingResponse
    
    bucket_name = f"user-{current_user.username}"
    object_name = f"{folder}/{filename}"
    
    try:
        response = minio_service.client.get_object(bucket_name, object_name)
        
        return StreamingResponse(
            response,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")

from pydantic import BaseModel

class SaveQueryResultRequest(BaseModel):
    query: str
    filename: str
    folder: str = "transformed"

@router.post("/save-query-result")
async def save_query_result(
    request: SaveQueryResultRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a query and save the result to MinIO"""
    try:
        db_path = f"/data/user_{current_user.id}.duckdb"
        conn = duckdb.connect(db_path)
        
        # Create a temporary CSV file
        temp_file = f"/tmp/{request.filename}"
        conn.execute(f"COPY ({request.query}) TO '{temp_file}' (HEADER, DELIMITER ',')")
        conn.close()
        
        # Upload to MinIO
        bucket_name = f"user-{current_user.username}"
        object_name = f"{request.folder}/{request.filename}"
        
        minio_service.client.fput_object(bucket_name, object_name, temp_file)
        
        # Clean up temp file
        import os
        os.remove(temp_file)
        
        # Log action
        from app.core.audit import log_action
        await log_action(
            db=db,
            user_id=current_user.id,
            action="file_saved",
            resource_type="file",
            details={"filename": request.filename, "folder": request.folder}
        )
        
        return {"message": "File saved successfully", "filename": request.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save query result: {str(e)}")

@router.post("/config", response_model=StorageConfigResponse)
async def create_storage_config(
    config: StorageConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update storage configuration"""
    
    encrypted_access = encrypt_value(config.access_key)
    encrypted_secret = encrypt_value(config.secret_key)
    
    existing = db.query(StorageConfig).filter(
        StorageConfig.user_id == current_user.id
    ).first()
    
    if existing:
        existing.storage_type = config.storage_type
        existing.bucket_name = config.bucket_name
        existing.region = config.region
        existing.endpoint = config.endpoint
        existing.access_key_encrypted = encrypted_access
        existing.secret_key_encrypted = encrypted_secret
        existing.encryption_enabled = config.encryption_enabled
        db_config = existing
    else:
        db_config = StorageConfig(
            user_id=current_user.id,
            storage_type=config.storage_type,
            bucket_name=config.bucket_name,
            region=config.region,
            endpoint=config.endpoint,
            access_key_encrypted=encrypted_access,
            secret_key_encrypted=encrypted_secret,
            encryption_enabled=config.encryption_enabled
        )
        db.add(db_config)
    
    db.commit()
    db.refresh(db_config)
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="storage_config_updated",
        resource_type="storage",
        details={"storage_type": config.storage_type}
    )
    
    return db_config

@router.get("/config", response_model=StorageConfigResponse)
async def get_storage_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current storage configuration"""
    
    config = db.query(StorageConfig).filter(
        StorageConfig.user_id == current_user.id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="No storage configuration found")
    
    return config
