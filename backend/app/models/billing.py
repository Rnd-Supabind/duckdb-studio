from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.database import Base

class PlanType(str, enum.Enum):
    FREE = "free"
    STANDARD = "standard"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    DEVELOPER = "developer"
    ADMIN = "admin"

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"

class BillingCycle(str, enum.Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

class Plan(Base):
    __tablename__ = "plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    plan_type = Column(SQLEnum(PlanType), nullable=False)
    price_monthly = Column(Float, default=0.0)
    price_yearly = Column(Float, default=0.0)
    features = Column(JSON, nullable=True)
    
    # Limits
    storage_gb = Column(Integer, default=1)
    max_workflows = Column(Integer, default=5)
    max_templates = Column(Integer, default=10)
    max_transformations_per_month = Column(Integer, default=100)
    max_files = Column(Integer, default=50)
    
    is_active = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    billing_cycle = Column(SQLEnum(BillingCycle), default=BillingCycle.MONTHLY)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - avoid back_populates to prevent circular import issues
    plan = relationship("Plan", back_populates="subscriptions")

class UserQuota(Base):
    __tablename__ = "user_quotas"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Current usage
    storage_used_bytes = Column(Integer, default=0)
    workflows_count = Column(Integer, default=0)
    templates_count = Column(Integer, default=0)
    transformations_this_month = Column(Integer, default=0)
    files_count = Column(Integer, default=0)
    
    # Last reset
    last_reset_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # "login", "upload_file", "create_workflow", etc.
    resource_type = Column(String(50), nullable=True)  # "file", "workflow", "template"
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User")
