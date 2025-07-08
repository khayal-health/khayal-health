from pydantic import BaseModel, Field, ConfigDict
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