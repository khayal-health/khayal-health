from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.user import UserResponse, ChefAvailabilityUpdate
from app.models.user import User, UserRole
from app.services.user import UserService
from app.config.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={401: {"description": "Unauthorized"}},
)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return UserResponse(**current_user.dict(by_alias=True))

@router.get("/subscribers", response_model=List[dict])
async def get_subscribers(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a list of all subscribers (basic info)"""
    user_service = UserService(db)
    subscribers = await user_service.get_subscribers_summary()
    return subscribers

@router.patch("/user/availability", response_model=UserResponse)
async def update_chef_availability(
    availability_update: ChefAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_service = UserService(db)
    
    updated_user = await user_service.update_chef_availability(
        str(current_user.id), 
        availability_update.available
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update availability"
        )
    
    return UserResponse(**updated_user.dict(by_alias=True))


@router.get("/caretaker/assigned-subscribers", response_model=List[dict])
async def get_assigned_subscribers_for_caretaker(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get list of subscribers assigned to the current caretaker with in_progress status"""
    # Verify the current user is a caretaker
    if current_user.role != UserRole.CARETAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to caretakers only"
        )
    
    from app.services.visit_request import VisitRequestService
    from app.models.user import CareVisitRequestStatus
    
    user_service = UserService(db)
    visit_request_service = VisitRequestService(db)
    
    # Get all care visit requests for this caretaker with in_progress status
    all_requests = await visit_request_service.get_care_visit_requests_by_caretaker(str(current_user.id))
    
    # Filter only in_progress requests
    in_progress_requests = [
        req for req in all_requests 
        if req.status == CareVisitRequestStatus.IN_PROGRESS
    ]
    
    # Get unique subscriber IDs
    subscriber_ids = list(set([str(req.subscriber_id) for req in in_progress_requests]))
    
    # Get subscriber details
    subscribers = []
    for sub_id in subscriber_ids:
        subscriber = await user_service.get_user_by_id(sub_id)
        if subscriber:
            subscribers.append({
                "id": str(subscriber.id),
                "name": subscriber.name
            })
    
    return subscribers

