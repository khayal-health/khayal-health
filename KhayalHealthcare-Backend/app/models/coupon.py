from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, List, Dict
from datetime import datetime
from app.models.user import PyObjectId
from bson import ObjectId

class CouponType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"

class CouponStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"

class Coupon(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    code: str  # Unique coupon code
    type: CouponType
    discount_percentage: Optional[float] = None  # For percentage type (0-100)
    discount_amount: Optional[float] = None  # For fixed amount type
    usage_limit: Optional[int] = None  # Total usage limit (None means unlimited)
    per_user_limit: Optional[int] = None  # How many times each user can use (None means unlimited)
    current_usage: int = 0
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    status: CouponStatus = CouponStatus.ACTIVE
    created_by: PyObjectId  # Admin who created the coupon
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Track usage count per user {user_id: count}
    user_usage_count: Dict[str, int] = {}
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    @validator('discount_percentage')
    def validate_percentage(cls, v, values):
        if values.get('type') == CouponType.PERCENTAGE and v is not None:
            if not 0 <= v <= 100:
                raise ValueError('Discount percentage must be between 0 and 100')
        return v
    
    @validator('discount_amount')
    def validate_amount(cls, v, values):
        if values.get('type') == CouponType.FIXED_AMOUNT and v is not None:
            if v <= 0:
                raise ValueError('Discount amount must be greater than 0')
        return v
    
    @validator('per_user_limit')
    def validate_per_user_limit(cls, v):
        if v is not None and v < 1:
            raise ValueError('Per user limit must be at least 1')
        return v

class CouponUsage(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    coupon_id: PyObjectId
    user_id: PyObjectId
    order_id: Optional[PyObjectId] = None
    used_at: datetime = Field(default_factory=datetime.utcnow)
    discount_applied: float
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
