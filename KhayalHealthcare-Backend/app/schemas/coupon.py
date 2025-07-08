from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, List, Dict
from datetime import datetime
from app.models.coupon import CouponType, CouponStatus

class CouponCreate(BaseModel):
    code: str
    type: CouponType
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None  # Total usage limit
    per_user_limit: Optional[int] = None  # Per user usage limit
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    @validator('code')
    def validate_code(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Coupon code must be at least 3 characters long')
        return v.strip().upper()
    
    @validator('discount_percentage')
    def validate_percentage_with_type(cls, v, values):
        if values.get('type') == CouponType.PERCENTAGE:
            if v is None:
                raise ValueError('Discount percentage is required for percentage type coupons')
            if not 0 < v <= 100:
                raise ValueError('Discount percentage must be between 0 and 100')
        return v
    
    @validator('discount_amount')
    def validate_amount_with_type(cls, v, values):
        if values.get('type') == CouponType.FIXED_AMOUNT:
            if v is None:
                raise ValueError('Discount amount is required for fixed amount type coupons')
            if v <= 0:
                raise ValueError('Discount amount must be greater than 0')
        return v
    
    @validator('usage_limit')
    def validate_usage_limit(cls, v):
        if v is not None and v < 1:
            raise ValueError('Total usage limit must be at least 1')
        return v
    
    @validator('per_user_limit')
    def validate_per_user_limit(cls, v):
        if v is not None and v < 1:
            raise ValueError('Per user limit must be at least 1')
        return v

class CouponUpdate(BaseModel):
    type: Optional[CouponType] = None
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_user_limit: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    status: Optional[CouponStatus] = None

class CouponResponse(BaseModel):
    id: str = Field(alias="_id")
    code: str
    type: CouponType
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_user_limit: Optional[int] = None
    current_usage: int
    valid_from: datetime
    valid_until: Optional[datetime] = None
    status: CouponStatus
    created_by: str
    created_at: datetime
    updated_at: datetime
    user_usage_count: Dict[str, int]
    
    model_config = ConfigDict(populate_by_name=True)

class CouponApply(BaseModel):
    code: str
    order_total: float  # To calculate discount
    
    @validator('code')
    def normalize_code(cls, v):
        return v.strip().upper()

class CouponValidateResponse(BaseModel):
    valid: bool
    message: str
    discount_amount: Optional[float] = None
    final_amount: Optional[float] = None
    user_usage_count: Optional[int] = None  # How many times user has used this coupon
    user_remaining_uses: Optional[int] = None  # How many more times user can use

class BulkCouponCreate(BaseModel):
    prefix: str  # Prefix for coupon codes
    quantity: int  # Number of coupons to generate
    type: CouponType
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    usage_limit: Optional[int] = None  # Total usage limit per coupon
    per_user_limit: Optional[int] = 1  # Default to single use per user
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    @validator('quantity')
    def validate_quantity(cls, v):
        if v < 1 or v > 1000:
            raise ValueError('Quantity must be between 1 and 1000')
        return v
