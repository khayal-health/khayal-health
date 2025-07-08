from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.services.auth import AuthService
from app.services.user import UserService
from app.config.database import get_database
import logging

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Register a new user"""
    try:
        logger.info(f"Registration attempt for username: {user_data.username}")
        user_service = UserService(db)
        
        # Check if username exists
        existing_user = await user_service.get_user_by_username(user_data.username)
        if existing_user:
            logger.warning(f"Registration failed - username exists: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{user_data.username}' is already taken. Please choose a different username."
            )
        
        # Check if email exists
        existing_email = await user_service.get_user_by_email(user_data.email)
        if existing_email:
            logger.warning(f"Registration failed - email exists: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_data.email}' is already registered. Please use a different email."
            )
        
        # Create user
        user = await user_service.create_user(user_data)
        logger.info(f"User registered successfully: {user.id}")
        
        # Convert to response model
        user_dict = user.dict(by_alias=True)
        return UserResponse(**user_dict)
    
    except ValueError as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user account: {str(e)}"
        )


@router.post("/login")
async def login(user_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Authenticate user and return access token with user data"""
    try:
        logger.info(f"Login attempt for username: {user_data.username}")
        auth_service = AuthService(db)
        result = await auth_service.login_user(user_data)
        logger.info(f"Login successful for user: {user_data.username}")
        return result
    except HTTPException:
        logger.warning(f"Login failed for user: {user_data.username}")
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )
