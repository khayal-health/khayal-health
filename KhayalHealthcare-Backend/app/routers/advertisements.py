from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole
from app.models.advertisement import AdvertisementStatus
from app.schemas.advertisement import (
    AdvertisementCreate, 
    AdvertisementUpdate, 
    AdvertisementResponse,
    AdvertisementClick
)
from app.services.advertisement import AdvertisementService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
from datetime import datetime
import os
import shutil
from pathlib import Path
import uuid
import logging

router = APIRouter(
    prefix="/advertisements",
    tags=["advertisements"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/advertisements")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

def validate_image(filename: str) -> bool:
    """Validate image file extension"""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

@router.post("", response_model=AdvertisementResponse, status_code=status.HTTP_201_CREATED)
async def create_advertisement(
    title: str = Form(...),
    description: str = Form(...),
    message: str = Form(...),
    target_role: UserRole = Form(...),
    display_order: int = Form(0),
    start_date: datetime = Form(...),
    end_date: datetime = Form(...),
    image: UploadFile = File(...),
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new advertisement (admin only)"""
    # Validate image
    if not image.filename or not validate_image(image.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPEG and PNG are allowed."
        )
    
    # Validate dates
    if start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    try:
        # Generate unique filename
        file_extension = Path(image.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        # Create advertisement data
        ad_data = AdvertisementCreate(
            title=title,
            description=description,
            message=message,
            target_role=target_role,
            display_order=display_order,
            start_date=start_date,
            end_date=end_date
        )
        
        # Save to database
        ad_service = AdvertisementService(db)
        advertisement = await ad_service.create_advertisement(
            ad_data, 
            str(file_path),
            str(admin_user.id)
        )
        
        return advertisement.dict(by_alias=True)
        
    except Exception as e:
        # Clean up file if database save fails
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        
        logger.error(f"Failed to create advertisement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create advertisement: {str(e)}"
        )

@router.get("/all", response_model=List[AdvertisementResponse])
async def get_all_advertisements(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all advertisements (admin only)"""
    ad_service = AdvertisementService(db)
    ads = await ad_service.get_all_advertisements()
    return [ad.dict(by_alias=True) for ad in ads]

@router.get("/my-ads", response_model=List[AdvertisementResponse])
async def get_my_advertisements(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get advertisements for current user's role"""
    ad_service = AdvertisementService(db)
    
    # Update expired ads first
    await ad_service.update_expired_advertisements()
    
    # Get ads for user's role
    ads = await ad_service.get_advertisements_by_role(current_user.role)
    
    # Increment view count for each ad
    for ad in ads:
        await ad_service.increment_view_count(str(ad.id))
    
    return [ad.dict(by_alias=True) for ad in ads]

@router.get("/{ad_id}", response_model=AdvertisementResponse)
async def get_advertisement(
    ad_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get specific advertisement"""
    ad_service = AdvertisementService(db)
    ad = await ad_service.get_advertisement_by_id(ad_id)
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Check if user can view this ad
    if current_user.role != UserRole.ADMIN and ad.target_role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this advertisement"
        )
    
    return ad.dict(by_alias=True)

@router.put("/{ad_id}", response_model=AdvertisementResponse)
async def update_advertisement(
    ad_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    target_role: Optional[UserRole] = Form(None),
    status: Optional[AdvertisementStatus] = Form(None),
    display_order: Optional[int] = Form(None),
    start_date: Optional[datetime] = Form(None),
    end_date: Optional[datetime] = Form(None),
    image: Optional[UploadFile] = File(None),
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update advertisement (admin only)"""
    ad_service = AdvertisementService(db)
    
    # Get existing ad
    existing_ad = await ad_service.get_advertisement_by_id(ad_id)
    if not existing_ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Handle image update
    image_path = None
    if image and image.filename:
        if not validate_image(image.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format. Only JPEG and PNG are allowed."
            )
        
        try:
            # Delete old image
            if existing_ad.image_url and os.path.exists(existing_ad.image_url):
                os.remove(existing_ad.image_url)
            
            # Save new image
            file_extension = Path(image.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_path = str(file_path)
            
        except Exception as e:
            logger.error(f"Failed to update image: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update image"
            )
    
    # Create update data
    update_data = AdvertisementUpdate()
    if title is not None:
        update_data.title = title
    if description is not None:
        update_data.description = description
    if message is not None:
        update_data.message = message
    if target_role is not None:
        update_data.target_role = target_role
    if status is not None:
        update_data.status = status
    if display_order is not None:
        update_data.display_order = display_order
    if start_date is not None:
        update_data.start_date = start_date
    if end_date is not None:
        update_data.end_date = end_date
    
    # Validate dates if both provided
    if start_date and end_date and start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Update advertisement
    updated_ad = await ad_service.update_advertisement(ad_id, update_data, image_path)
    
    if not updated_ad:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update advertisement"
        )
    
    return updated_ad.dict(by_alias=True)

@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_advertisement(
    ad_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete advertisement (admin only)"""
    ad_service = AdvertisementService(db)
    
    success = await ad_service.delete_advertisement(ad_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found or could not be deleted"
        )
    
    return None
