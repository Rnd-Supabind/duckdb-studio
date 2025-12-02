from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.database import get_db
from app.models.models import User
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
        role="user"  # Default role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create MinIO bucket for the new user
    try:
        from app.services.minio_service import minio_service
        minio_service.create_user_bucket(new_user.username)
    except Exception as e:
        # Log error but don't fail signup if bucket creation fails
        print(f"Warning: Failed to create MinIO bucket for {new_user.username}: {e}")

    # Ensure Temporal namespace for the new user
    try:
        ns = namespace_for_user(username=new_user.username, email=new_user.email, fallback_id=new_user.id)
        # Run async ensure from sync context
        import anyio
        anyio.from_thread.run(ensure_namespace, ns)
    except Exception as e:
        print(f"Warning: Namespace ensure failed for {new_user.username}: {e}")
    
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
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Ensure Temporal namespace for the user
    try:
        ns = namespace_for_user(username=db_user.username, email=db_user.email, fallback_id=db_user.id)
        import anyio
        anyio.from_thread.run(ensure_namespace, ns)
    except Exception:
        pass

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

