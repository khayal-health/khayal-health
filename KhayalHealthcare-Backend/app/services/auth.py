from datetime import timedelta
from fastapi import HTTPException, status
from app.utils.auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.services.user import UserService
from app.schemas.user import UserLogin, Token
import logging

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db):
        self.db = db
        self.user_service = UserService(db)
    
    async def authenticate_user(self, username: str, password: str):
        """Authenticate user with username and password"""
        try:
            # Try to get user (case-insensitive)
            user = await self.user_service.get_user_by_username_case_insensitive(username)
            if not user:
                logger.info(f"Authentication failed - user not found: {username}")
                return False
            
            # Verify password
            if not verify_password(password, user.password):
                logger.info(f"Authentication failed - incorrect password for user: {username}")
                return False
            
            logger.info(f"Authentication successful for user: {username}")
            return user
            
        except Exception as e:
            logger.error(f"Authentication error for user {username}: {str(e)}")
            # Don't return False on errors, raise exception to differentiate from wrong credentials
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service temporarily unavailable"
            )
    
    async def login_user(self, user_data: UserLogin):
        """Login user and return access token with user data"""
        try:
            user = await self.authenticate_user(user_data.username, user_data.password)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.username}, expires_delta=access_token_expires
            )
            
            # Return both token and user data
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user.dict(by_alias=True)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login service error. Please try again."
            )
