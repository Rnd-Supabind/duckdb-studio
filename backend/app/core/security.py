from cryptography.fernet import Fernet
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import base64

# In production, this should be stored in a secure vault (e.g., AWS Secrets Manager, HashiCorp Vault)
# For now, we'll use an environment variable
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Generate a key for development (DO NOT USE IN PRODUCTION)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"WARNING: Using generated encryption key. Set ENCRYPTION_KEY env var in production.")

cipher_suite = Fernet(ENCRYPTION_KEY.encode())

# Password hashing (supporting multiple schemes for backward compatibility)
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def encrypt_value(value: str) -> str:
    """Encrypt a sensitive value (e.g., API keys, passwords)"""
    if not value:
        return None
    encrypted = cipher_suite.encrypt(value.encode())
    return base64.b64encode(encrypted).decode()

def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a sensitive value"""
    if not encrypted_value:
        return None
    decoded = base64.b64decode(encrypted_value.encode())
    decrypted = cipher_suite.decrypt(decoded)
    return decrypted.decode()

def validate_sql_query(query: str) -> tuple[bool, str]:
    """
    Basic SQL injection prevention and query validation.
    In production, use a more robust solution like sqlparse + whitelist.
    """
    # Forbidden patterns (basic protection)
    forbidden = [
        "DROP TABLE",
        "DROP DATABASE",
        "DELETE FROM users",
        "TRUNCATE",
        "--",
        "/*",
        "xp_",
        "sp_",
    ]
    
    query_upper = query.upper()
    
    for pattern in forbidden:
        if pattern in query_upper:
            return False, f"Query contains forbidden pattern: {pattern}"
    
    return True, "Query validated"

def sanitize_input(value: str, max_length: int = 1000) -> str:
    """Sanitize user input to prevent injection attacks"""
    if not value:
        return ""
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Limit length
    if len(value) > max_length:
        value = value[:max_length]
    
    return value.strip()

# Password hashing functions
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

# JWT token functions
def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    """Decode and verify a JWT access token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

