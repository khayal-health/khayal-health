from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.message import MessageCreate, MessageResponse
from app.services.message import MessageService
from app.config.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/messages",
    tags=["messages"],
    responses={401: {"description": "Unauthorized"}},
)

@router.get("/{user_id}", response_model=List[MessageResponse])
async def get_messages_for_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get messages for a specific user (sent or received)"""
    message_service = MessageService(db)
    messages = await message_service.get_messages_for_user(user_id)
    return [message.dict(by_alias=True) for message in messages]

@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new message"""
    message_service = MessageService(db)
    message = await message_service.create_message(message_data)
    return message.dict(by_alias=True)
