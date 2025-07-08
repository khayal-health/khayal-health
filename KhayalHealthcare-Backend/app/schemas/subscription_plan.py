from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.subscription_plan import PlanType, PlanTier, BillingCycle, NumericValues, BillingInfo

class SubscriptionPlanCreate(BaseModel):
    plan_id: str
    type: PlanType
    tier: PlanTier
    name: str
    icon: str
    color: str
    price: float
    features: List[str]
    frequency: str
    duration: str
    description: str
    highlights: List[str]
    limitations: Optional[List[str]] = []
    popular: Optional[bool] = False
    visibility: bool = True
    
    numeric: NumericValues
    billing: BillingInfo

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    price: Optional[float] = None
    features: Optional[List[str]] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None
    highlights: Optional[List[str]] = None
    limitations: Optional[List[str]] = None
    popular: Optional[bool] = None
    visibility: Optional[bool] = None
    
    numeric: Optional[NumericValues] = None
    billing: Optional[BillingInfo] = None

class SubscriptionPlanResponse(BaseModel):
    id: str = Field(alias="_id")
    plan_id: str
    type: PlanType
    tier: PlanTier
    name: str
    icon: str
    color: str
    price: float
    features: List[str]
    frequency: str
    duration: str
    description: str
    highlights: List[str]
    limitations: List[str]
    popular: bool
    visibility: bool
    
    numeric: NumericValues
    billing: BillingInfo
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)

class SubscriptionPlanVisibilityUpdate(BaseModel):
    visibility: bool
