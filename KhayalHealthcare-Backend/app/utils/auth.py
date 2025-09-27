from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from decouple import config
import logging

SECRET_KEY = config('SECRET_KEY')
ALGORITHM = config('ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(config('ACCESS_TOKEN_EXPIRE_MINUTES'))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        # BCrypt hashes start with $2a$, $2b$, or $2y$
        if hashed_password.startswith(('$2a$', '$2b$', '$2y$')):
            return pwd_context.verify(plain_password, hashed_password)
        else:
            # Legacy plain text password support
            logger.warning("Plain text password detected - consider updating to hashed password")
            return plain_password == hashed_password
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Check password length to prevent BCrypt 72-byte limit error
    if len(password.encode('utf-8')) > 72:
        raise ValueError('Password cannot be longer than 72 bytes. Please use a shorter password.')
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return username"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError as e:
        logger.error(f"Token verification error: {str(e)}")
        return None
