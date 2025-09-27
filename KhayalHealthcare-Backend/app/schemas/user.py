from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, ApprovalStatus, SubscriptionStatus

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    name: str
    phone: str
    role: UserRole
    age: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    previous_illness: Optional[str] = None
    experience: Optional[int] = None
    degree: Optional[str] = None

    @validator('password')
    def validate_password(cls, v):
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password cannot be longer than 72 bytes. Please use a shorter password.')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long.')
        return v

    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long.')
        if len(v) > 50:
            raise ValueError('Username cannot be longer than 50 characters.')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    username: str
    email: str
    name: str
    phone: str
    role: UserRole
    age: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    previous_illness: Optional[str] = None
    experience: Optional[int] = None
    degree: Optional[str] = None
    available: bool = True
    approval_status: ApprovalStatus
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_plans: Optional[List[str]] = Field(default_factory=list)
    subscription_expiry: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Replace the Config class with model_config
    model_config = ConfigDict(populate_by_name=True)

class ChefAvailabilityUpdate(BaseModel):
    available: bool

class UserUpdate(BaseModel):
    approval_status: Optional[ApprovalStatus] = None
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_plan: Optional[str] = None
    subscription_expiry: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class SubscriptionUpdate(BaseModel):
    subscription_status: SubscriptionStatus
    subscription_plans: List[str]
    subscription_expiry: datetime
    subscription_renewal_date: Optional[datetime] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if sum(c.isdigit() for c in v) < 2:
            raise ValueError('Password must contain at least two numbers')
        return v