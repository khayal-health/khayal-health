from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class PlanType(str, Enum):
    FOOD = "food"
    CHEF = "chef"
    PSYCHOLOGIST = "psychologist"
    CARETAKER = "caretaker"

class PlanTier(str, Enum):
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    DAILY = "daily"

class NumericValues(BaseModel):
    days_per_week: int
    hours_per_day: Optional[int] = None
    hours_per_visit: Optional[int] = None
    meals_per_day: Optional[int] = None
    snacks_per_day: Optional[int] = None
    sessions_per_month: Optional[int] = None
    minutes_per_session: Optional[int] = None
    visits_per_week: Optional[int] = None
    total_monthly_hours: Optional[float] = None
    consultations_per_month: Optional[int] = None
    services_per_month: Optional[int] = None
    coverage_days: Optional[int] = None
    on_demand_available: Optional[bool] = False
    weekend_included: Optional[bool] = False

class BillingInfo(BaseModel):
    cycle: BillingCycle
    amount: float

class SubscriptionPlan(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
