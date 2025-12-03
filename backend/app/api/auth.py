from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.database import get_db
from app.models.models import User, UserRole
from app.core.security import get_password_hash, create_access_token
from datetime import timedelta
from app.services.temporal_utils import ensure_namespace, namespace_for_user

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserLogin(BaseModel):
    username: str
    password: str


@router.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_email = db.query(User).filter(User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_active=True,
        role=UserRole.USER  # Default role as enum
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create MinIO bucket for the new user
    bucket_created = False
    try:
        from app.services.minio_service import minio_service
        bucket_created = minio_service.create_user_bucket(new_user.username)
        if bucket_created:
            print(f"✓ Created MinIO bucket for user: {new_user.username}")
        else:
            print(f"✗ Failed to create MinIO bucket for user: {new_user.username}")
    except Exception as e:
        print(f"✗ Error creating MinIO bucket for {new_user.username}: {e}")
        # Don't fail signup if bucket creation fails - it can be created later

    # Assign Free Plan
    try:
        from app.models.billing import Plan, PlanType, Subscription, SubscriptionStatus, BillingCycle
        free_plan = db.query(Plan).filter(Plan.plan_type == PlanType.FREE).first()
        if free_plan:
            subscription = Subscription(
                user_id=new_user.id,
                plan_id=free_plan.id,
                status=SubscriptionStatus.ACTIVE,
                billing_cycle=BillingCycle.MONTHLY,
                started_at=datetime.utcnow()
            )
            db.add(subscription)
            db.commit()
            print(f"✓ Assigned Free Plan to user: {new_user.username}")
            
            # Initialize user quota
            from app.models.billing import UserQuota
            quota = UserQuota(user_id=new_user.id)
            db.add(quota)
            db.commit()
        else:
            print(f"✗ Free Plan not found in database")
    except Exception as e:
        print(f"✗ Error assigning plan to {new_user.username}: {e}")
        import traceback
        traceback.print_exc()

    # Ensure Temporal namespace for the new user
    namespace_created = False
    try:
        from app.services.temporal_utils import ensure_namespace, namespace_for_user
        ns = namespace_for_user(username=new_user.username, email=new_user.email, fallback_id=new_user.id)
        
        # Use asyncio instead of anyio for better compatibility
        import asyncio
        try:
            # Try to get the running event loop
            loop = asyncio.get_running_loop()
            # We're in a sync context being called by FastAPI, so we shouldn't have a running loop
            # If we do, something is wrong
            print(f"Warning: Unexpected running event loop during user signup")
        except RuntimeError:
            # No running loop - this is expected in sync context
            pass
        
        # Create new event loop for this operation
        namespace_created = asyncio.run(ensure_namespace(ns))
        if namespace_created:
            print(f"✓ Created Temporal namespace for user: {new_user.username}")
        else:
            print(f"✗ Failed to create Temporal namespace for user: {new_user.username}")
    except Exception as e:
        print(f"✗ Temporal namespace creation failed for {new_user.username}: {e}")
        # Don't fail signup if namespace creation fails - it can be created on first workflow
    
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    from app.core.security import verify_password
    
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user:
        print(f"Login failed: User {user.username} not found")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not verify_password(user.password, db_user.hashed_password):
        print(f"Login failed: Password mismatch for {user.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not db_user.is_active:
        print(f"Login failed: User {user.username} is inactive")
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    print(f"Login successful for {user.username}")
    
    # Ensure Temporal namespace for the user
    try:
        from app.services.temporal_utils import ensure_namespace, namespace_for_user
        ns = namespace_for_user(username=db_user.username, email=db_user.email, fallback_id=db_user.id)
        import asyncio
        asyncio.run(ensure_namespace(ns))
    except Exception:
        # Silently fail - namespace will be created on first workflow if needed
        pass

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

