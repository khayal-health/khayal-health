from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from app.models.user import PyObjectId, UserRole
from bson import ObjectId

class AdvertisementStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"

class Advertisement(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    title: str
    description: str
    message: str
    image_url: str  # Path to stored image
    target_role: UserRole  # Which role should see this ad
    status: AdvertisementStatus = AdvertisementStatus.ACTIVE
    display_order: int = 0  # For ordering ads
    start_date: datetime
    end_date: datetime
    click_count: int = 0
    view_count: int = 0
    created_by: PyObjectId  # Admin who created the ad
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
