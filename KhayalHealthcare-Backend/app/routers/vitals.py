from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.vitals import VitalsCreate, VitalsResponse
from app.services.vitals import VitalsService
from app.services.user import UserService
from app.config.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/vitals",
    tags=["vitals"],
    responses={401: {"description": "Unauthorized"}},
)

@router.get("/{subscriber_id}", response_model=List[VitalsResponse])
async def get_vitals_by_subscriber(
    subscriber_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get vitals for a specific subscriber"""
    vitals_service = VitalsService(db)
    user_service = UserService(db)
    
    # Get vitals
    vitals = await vitals_service.get_vitals_by_subscriber(subscriber_id)
    
    # Get all caretakers for adding names
    caretakers = await user_service.get_users_by_role("caretaker")
    
    # Add caretaker name to each vital record
    vitals_with_caretakers = []
    for vital in vitals:
        vital_dict = vital.dict(by_alias=True)
        
        # Find caretaker name
        caretaker_name = None
        if vital.caretaker_id:
            caretaker = next((c for c in caretakers if c.id == vital.caretaker_id), None)
            caretaker_name = caretaker.name if caretaker else "Unknown"
            
        vital_dict["caretaker_name"] = caretaker_name
        vitals_with_caretakers.append(vital_dict)
    
    return vitals_with_caretakers

@router.get("/self/{subscriber_id}", response_model=List[VitalsResponse])
async def get_self_vitals_by_subscriber(
    subscriber_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get self-reported vitals for a specific subscriber"""
    vitals_service = VitalsService(db)
    vitals = await vitals_service.get_self_vitals_by_subscriber(subscriber_id)
    return [vital.dict(by_alias=True) for vital in vitals]

@router.get("/remotePPG/{subscriber_id}", response_model=List[VitalsResponse])
async def get_remote_ppg_vitals_by_subscriber(
    subscriber_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get remotePPG vitals for a specific subscriber"""
    vitals_service = VitalsService(db)
    vitals = await vitals_service.get_remote_ppg_vitals_by_subscriber(subscriber_id)
    return [vital.dict(by_alias=True) for vital in vitals]

@router.post("", response_model=VitalsResponse, status_code=status.HTTP_201_CREATED)
async def create_vitals(
    vitals_data: VitalsCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new vitals record"""
    vitals_service = VitalsService(db)
    vitals = await vitals_service.create_vitals(vitals_data)
    return vitals.dict(by_alias=True)
