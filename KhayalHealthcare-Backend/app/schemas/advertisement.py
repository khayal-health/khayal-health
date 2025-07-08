from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
from app.models.advertisement import AdvertisementStatus

class AdvertisementCreate(BaseModel):
    title: str
    description: str
    message: str
    target_role: UserRole
    display_order: int = 0
    start_date: datetime
    end_date: datetime

class AdvertisementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    message: Optional[str] = None
    target_role: Optional[UserRole] = None
    status: Optional[AdvertisementStatus] = None
    display_order: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AdvertisementResponse(BaseModel):
    id: str = Field(alias="_id")
    title: str
    description: str
    message: str
    image_url: str
    target_role: UserRole
    status: AdvertisementStatus
    display_order: int
    start_date: datetime
    end_date: datetime
    click_count: int
    view_count: int
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)

class AdvertisementClick(BaseModel):
    advertisement_id: str
