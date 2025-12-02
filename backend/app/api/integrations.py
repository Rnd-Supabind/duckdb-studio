from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Integration, AuditLog
from app.core.security import encrypt_value, decrypt_value
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import aiohttp
import asyncio

router = APIRouter()

# Pydantic models
class IntegrationBase(BaseModel):
    name: str
    provider: str
    config: Optional[Dict[str, Any]] = {}

class IntegrationCreate(IntegrationBase):
    credentials: Dict[str, Any]  # Will be encrypted

class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    credentials: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class IntegrationResponse(IntegrationBase):
    id: int
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[IntegrationResponse])
async def list_integrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all integrations for the current user"""
    integrations = db.query(Integration).filter(Integration.user_id == current_user.id).all()
    
    # Parse config JSON
    result = []
    for i in integrations:
        config = {}
        if i.config:
            try:
                config = json.loads(i.config)
            except:
                pass
        
        result.append({
            "id": i.id,
            "name": i.name,
            "provider": i.provider,
            "config": config,
            "is_active": i.is_active,
            "created_at": i.created_at.isoformat(),
            "updated_at": i.updated_at.isoformat()
        })
    
    return result

@router.post("/", response_model=IntegrationResponse)
async def create_integration(
    integration: IntegrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new integration"""
    
    # Encrypt credentials
    creds_json = json.dumps(integration.credentials)
    encrypted_creds = encrypt_value(creds_json)
    
    # Store config as JSON string
    config_str = json.dumps(integration.config) if integration.config else "{}"
    
    new_integration = Integration(
        user_id=current_user.id,
        name=integration.name,
        provider=integration.provider,
        encrypted_credentials=encrypted_creds,
        config=config_str,
        is_active=True
    )
    
    db.add(new_integration)
    db.commit()
    db.refresh(new_integration)
    
    # Log action
    log = AuditLog(
        user_id=current_user.id,
        action="integration_created",
        resource_type="integration",
        resource_id=str(new_integration.id),
        details=json.dumps({"provider": integration.provider, "name": integration.name})
    )
    db.add(log)
    db.commit()
    
    return {
        "id": new_integration.id,
        "name": new_integration.name,
        "provider": new_integration.provider,
        "config": integration.config,
        "is_active": new_integration.is_active,
        "created_at": new_integration.created_at.isoformat(),
        "updated_at": new_integration.updated_at.isoformat()
    }

@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific integration"""
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    config = {}
    if integration.config:
        try:
            config = json.loads(integration.config)
        except:
            pass
            
    return {
        "id": integration.id,
        "name": integration.name,
        "provider": integration.provider,
        "config": config,
        "is_active": integration.is_active,
        "created_at": integration.created_at.isoformat(),
        "updated_at": integration.updated_at.isoformat()
    }

@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: int,
    update_data: IntegrationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an integration"""
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    if update_data.name:
        integration.name = update_data.name
        
    if update_data.config is not None:
        integration.config = json.dumps(update_data.config)
        
    if update_data.credentials:
        creds_json = json.dumps(update_data.credentials)
        integration.encrypted_credentials = encrypt_value(creds_json)
        
    if update_data.is_active is not None:
        integration.is_active = update_data.is_active
        
    db.commit()
    db.refresh(integration)
    
    config = {}
    if integration.config:
        try:
            config = json.loads(integration.config)
        except:
            pass
            
    return {
        "id": integration.id,
        "name": integration.name,
        "provider": integration.provider,
        "config": config,
        "is_active": integration.is_active,
        "created_at": integration.created_at.isoformat(),
        "updated_at": integration.updated_at.isoformat()
    }

@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an integration"""
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    db.delete(integration)
    db.commit()
    
    # Log action
    log = AuditLog(
        user_id=current_user.id,
        action="integration_deleted",
        resource_type="integration",
        resource_id=str(integration_id),
        details=json.dumps({"provider": integration.provider, "name": integration.name})
    )
    db.add(log)
    db.commit()
    
    return {"message": "Integration deleted successfully"}

@router.post("/{integration_id}/test")
async def test_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test connection for an integration"""
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.user_id == current_user.id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # Decrypt credentials
    try:
        creds_json = decrypt_value(integration.encrypted_credentials)
        creds = json.loads(creds_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials")
    
    provider = integration.provider.lower()
    
    try:
        if provider == "openai":
            # Test OpenAI connection
            api_key = creds.get("api_key")
            if not api_key:
                raise ValueError("Missing API key")
                
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                ) as response:
                    if response.status != 200:
                        raise ValueError(f"OpenAI API returned {response.status}")
                        
        elif provider == "anthropic":
            # Test Anthropic connection
            api_key = creds.get("api_key")
            if not api_key:
                raise ValueError("Missing API key")
                
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.anthropic.com/v1/models",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"}
                ) as response:
                    if response.status != 200:
                        raise ValueError(f"Anthropic API returned {response.status}")

        elif provider in ["postgres", "postgresql"]:
            # Test Postgres connection
            import psycopg2
            
            conn = psycopg2.connect(
                host=creds.get("host"),
                port=creds.get("port", 5432),
                database=creds.get("database"),
                user=creds.get("username"),
                password=creds.get("password")
            )
            conn.close()
            
        elif provider == "mysql":
            # Test MySQL connection
            import mysql.connector
            
            conn = mysql.connector.connect(
                host=creds.get("host"),
                port=creds.get("port", 3306),
                database=creds.get("database"),
                user=creds.get("username"),
                password=creds.get("password")
            )
            conn.close()
            
        elif provider == "gemini":
            # Test Google Gemini (Generative Language) API
            api_key = creds.get("api_key")
            if not api_key:
                raise ValueError("Missing API key")
            url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        raise ValueError(f"Gemini API returned {response.status}")

        elif provider == "http":
            # Test generic HTTP
            url = creds.get("url") or (json.loads(integration.config or "{}").get("url"))
            method = creds.get("method", "GET")
            headers = creds.get("headers", {})
            
            async with aiohttp.ClientSession() as session:
                async with session.request(method, url, headers=headers) as response:
                    # Just checking if we get a response, status code might be anything valid
                    pass

        elif provider == "odoo":
            # Test Odoo connection
            import xmlrpc.client
            
            url = creds.get("url")
            db_name = creds.get("db")
            username = creds.get("username")
            password = creds.get("password")
            
            if not all([url, db_name, username, password]):
                raise ValueError("Missing required Odoo credentials")
            
            # Ensure URL doesn't end with slash
            if url.endswith('/'):
                url = url[:-1]
                
            common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
            uid = common.authenticate(db_name, username, password, {})
            
            if not uid:
                raise ValueError("Authentication failed")
                    
        else:
            return {"status": "unknown", "message": f"Test not implemented for provider {provider}"}
            
        return {"status": "success", "message": "Connection successful"}
        
    except Exception as e:
        return {"status": "failed", "message": str(e)}
