from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.schemas.verification import (
    VerificationCodeVerify, ResendCodeRequest, 
    PasswordResetRequest, PasswordResetVerify,
    VerificationCodeResponse
)
from app.services.auth import AuthService
from app.services.user import UserService
from app.services.verification import VerificationService
from app.models.verification import VerificationType, VerificationMethod
from app.config.database import get_database
import logging
from datetime import datetime
from bson import ObjectId

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

@router.post("/register", response_model=VerificationCodeResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Register a new user - sends verification code"""
    try:
        logger.info(f"Registration attempt for username: {user_data.username}")
        user_service = UserService(db)
        verification_service = VerificationService(db)
        
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
        
        # Create verification code and store registration data
        from app.schemas.verification import VerificationCodeCreate
        verification_data = VerificationCodeCreate(
            email=user_data.email,
            phone=user_data.phone,
            username=user_data.username,
            type=VerificationType.REGISTRATION,
            method=VerificationMethod.BOTH,
            registration_data=user_data.dict()
        )
        
        success, message, verification = await verification_service.create_verification_code(verification_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return VerificationCodeResponse(
            message="Verification code sent to your email and WhatsApp",
            email=user_data.email,
            phone=user_data.phone,
            expires_in_minutes=10,
            can_resend_after_minutes=5
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during registration: {str(e)}"
        )

@router.post("/verify-registration", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def verify_registration(
    verification_data: VerificationCodeVerify,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Verify registration code and create user"""
    try:
        verification_service = VerificationService(db)
        user_service = UserService(db)
        
        # Verify the code
        success, message, registration_data = await verification_service.verify_code(
            verification_data.email,
            verification_data.phone,
            verification_data.code,
            verification_data.type
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        if not registration_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration data not found. Please start registration again."
            )
        
        # Create the user with verified status
        user_create = UserCreate(**registration_data)
        user = await user_service.create_user(user_create, email_verified=True, phone_verified=True)
        
        logger.info(f"User registered and verified successfully: {user.id}")
        
        # Convert to response model
        user_dict = user.dict(by_alias=True)
        return UserResponse(**user_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during verification: {str(e)}"
        )

@router.post("/resend-code", response_model=VerificationCodeResponse)
async def resend_verification_code(
    resend_data: ResendCodeRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Resend verification code"""
    try:
        verification_service = VerificationService(db)
        
        success, message = await verification_service.resend_code(
            resend_data.email,
            resend_data.phone,
            resend_data.type
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return VerificationCodeResponse(
            message="Verification code resent successfully",
            email=resend_data.email,
            phone=resend_data.phone,
            expires_in_minutes=10,
            can_resend_after_minutes=5
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend code error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification code"
        )

@router.post("/forgot-password", response_model=VerificationCodeResponse)
async def forgot_password(
    reset_data: PasswordResetRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Request password reset"""
    try:
        user_service = UserService(db)
        verification_service = VerificationService(db)
        
        # Find user by email or username
        user = None
        if "@" in reset_data.identifier:
            user = await user_service.get_user_by_email(reset_data.identifier)
        else:
            user = await user_service.get_user_by_username(reset_data.identifier)
        
        if not user:
            # Don't reveal if user exists
            raise HTTPException(
                status_code=status.HTTP_200_OK,
                detail="If the account exists, a verification code will be sent"
            )
        
        # Create verification code
        from app.schemas.verification import VerificationCodeCreate
        verification_data = VerificationCodeCreate(
            email=user.email,
            phone=user.phone,
            type=VerificationType.PASSWORD_RESET,
            method=reset_data.method
        )
        
        success, message, _ = await verification_service.create_verification_code(
            verification_data,
            str(user.id)
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return VerificationCodeResponse(
            message=f"Verification code sent via {reset_data.method.value}",
            email=user.email,
            phone=user.phone,
            expires_in_minutes=10,
            can_resend_after_minutes=5
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset request error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )

@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordResetVerify,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Reset password with verification code"""
    try:
        verification_service = VerificationService(db)
        user_service = UserService(db)
        
        # Verify the code
        success, message, _ = await verification_service.verify_code(
            reset_data.email,
            reset_data.phone,
            reset_data.code,
            VerificationType.PASSWORD_RESET
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        # Find and update user password
        user = await user_service.get_user_by_email(reset_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        from app.utils.auth import get_password_hash
        hashed_password = get_password_hash(reset_data.new_password)
        
        await db.users.update_one(
            {"_id": ObjectId(user.id)},
            {"$set": {
                "password": hashed_password,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.post("/login")
async def login(user_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Authenticate user and return access token with user data"""
    try:
        logger.info(f"Login attempt for username: {user_data.username}")
        auth_service = AuthService(db)
        user_service = UserService(db)
        
        # First check if user is verified
        user = await user_service.get_user_by_username_case_insensitive(user_data.username)
        if user and not (user.email_verified and user.phone_verified):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email and phone number before logging in"
            )
        
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
