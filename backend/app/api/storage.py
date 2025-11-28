from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.models.models import StorageConfig
from app.core.security import encrypt_value, decrypt_value
from app.core.audit import log_action
import boto3
from typing import Optional

router = APIRouter()

class StorageConfigCreate(BaseModel):
    storage_type: str  # s3, minio, local
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

@router.post("/config", response_model=StorageConfigResponse)
async def create_storage_config(
    config: StorageConfigCreate,
    db: Session = Depends(get_db)
):
    """Create or update storage configuration"""
    user_id = 1  # TODO: Get from JWT
    
    # Encrypt sensitive data
    encrypted_access = encrypt_value(config.access_key)
    encrypted_secret = encrypt_value(config.secret_key)
    
    # Check if config exists
    existing = db.query(StorageConfig).filter(
        StorageConfig.user_id == user_id
    ).first()
    
    if existing:
        # Update existing
        existing.storage_type = config.storage_type
        existing.bucket_name = config.bucket_name
        existing.region = config.region
        existing.endpoint = config.endpoint
        existing.access_key_encrypted = encrypted_access
        existing.secret_key_encrypted = encrypted_secret
        existing.encryption_enabled = config.encryption_enabled
        db_config = existing
    else:
        # Create new
        db_config = StorageConfig(
            user_id=user_id,
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
        user_id=user_id,
        action="storage_config_updated",
        resource_type="storage",
        details={"storage_type": config.storage_type}
    )
    
    return db_config

@router.get("/config", response_model=StorageConfigResponse)
async def get_storage_config(db: Session = Depends(get_db)):
    """Get current storage configuration"""
    user_id = 1  # TODO: Get from JWT
    
    config = db.query(StorageConfig).filter(
        StorageConfig.user_id == user_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="No storage configuration found")
    
    return config

@router.get("/buckets")
async def list_buckets(db: Session = Depends(get_db)):
    """List buckets from configured storage"""
    user_id = 1  # TODO: Get from JWT
    
    config = db.query(StorageConfig).filter(
        StorageConfig.user_id == user_id
    ).first()
    
    if not config:
        return {"buckets": []}
    
    try:
        # Decrypt credentials
        access_key = decrypt_value(config.access_key_encrypted)
        secret_key = decrypt_value(config.secret_key_encrypted)
        
        # Create S3 client
        s3_config = {
            'aws_access_key_id': access_key,
            'aws_secret_access_key': secret_key,
            'region_name': config.region
        }
        
        if config.endpoint:
            s3_config['endpoint_url'] = config.endpoint
        
        s3 = boto3.client('s3', **s3_config)
        
        # List buckets
        response = s3.list_buckets()
        buckets = [bucket['Name'] for bucket in response.get('Buckets', [])]
        
        return {"buckets": buckets}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to list buckets: {str(e)}")

@router.post("/test")
async def test_connection(db: Session = Depends(get_db)):
    """Test storage connection"""
    user_id = 1  # TODO: Get from JWT
    
    config = db.query(StorageConfig).filter(
        StorageConfig.user_id == user_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="No storage configuration found")
    
    try:
        access_key = decrypt_value(config.access_key_encrypted)
        secret_key = decrypt_value(config.secret_key_encrypted)
        
        s3_config = {
            'aws_access_key_id': access_key,
            'aws_secret_access_key': secret_key,
            'region_name': config.region
        }
        
        if config.endpoint:
            s3_config['endpoint_url'] = config.endpoint
        
        s3 = boto3.client('s3', **s3_config)
        s3.list_buckets()
        
        return {"status": "success", "message": "Connection successful"}
        
    except Exception as e:
        return {"status": "failed", "message": str(e)}
