from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workflows = relationship("Workflow", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="user")
    # Note: subscriptions and quota are in billing.py to avoid circular imports

class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    schedule = Column(String(100))  # Cron expression
    query = Column(Text, nullable=False)
    status = Column(String(50), default="paused")  # active, paused, error
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    
    # Extended Configuration
    source_type = Column(String(50), default="none")
    source_config = Column(Text, default="{}")
    destination_type = Column(String(50), default="storage")
    destination_config = Column(Text, default="{}")
    template_id = Column(Integer, ForeignKey("query_templates.id"), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="workflows")
    executions = relationship("WorkflowExecution", back_populates="workflow")
    # Optional template relationship for convenience
    template = relationship("QueryTemplate", primaryjoin="Workflow.template_id==QueryTemplate.id", viewonly=True)

class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    status = Column(String(50))  # success, failed, running
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    rows_affected = Column(Integer, nullable=True)
    
    # Temporal fields
    temporal_workflow_id = Column(String(255), nullable=True)
    temporal_run_id = Column(String(255), nullable=True)
    
    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
    execution_steps = relationship("WorkflowExecutionStep", back_populates="execution", cascade="all, delete-orphan")

class WorkflowExecutionStep(Base):
    __tablename__ = "workflow_execution_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("workflow_executions.id"))
    step_number = Column(Integer)
    step_name = Column(String(255))  # "fetch_source", "transform", "save_destination"
    status = Column(String(50))  # running, success, failed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    output_data = Column(Text, nullable=True)  # JSON
    
    # Relationships
    execution = relationship("WorkflowExecution", back_populates="execution_steps")

class StorageConfig(Base):
    __tablename__ = "storage_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    storage_type = Column(String(50))  # s3, minio, local
    bucket_name = Column(String(255))
    region = Column(String(100))
    endpoint = Column(String(255), nullable=True)
    access_key_encrypted = Column(Text)  # Encrypted
    secret_key_encrypted = Column(Text)  # Encrypted
    encryption_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)  # query_executed, workflow_created, etc.
    resource_type = Column(String(100))  # workflow, query, storage
    resource_id = Column(String(100), nullable=True)
    details = Column(Text)  # JSON details
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

class QueryTemplate(Base):
    __tablename__ = "query_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    query = Column(Text, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    provider = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    encrypted_credentials = Column(Text, nullable=False)
    config = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="integrations")

# Add relationship to User for integrations
User.integrations = relationship("Integration", back_populates="user", cascade="all, delete-orphan")
