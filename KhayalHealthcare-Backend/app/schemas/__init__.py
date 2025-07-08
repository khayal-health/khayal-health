"""Pydantic schemas for request/response validation"""

# User schemas
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    Token,
    TokenData
)

# Other schemas
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentNotesUpdate
)
from app.schemas.meal import MealCreate, MealResponse
from app.schemas.message import MessageCreate, MessageResponse
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.schemas.vitals import VitalsCreate, VitalsResponse
from app.schemas.visit_request import (
    CareVisitRequestCreate,
    CareVisitRequestResponse,
    CareVisitRequestAssign,
    PsychologistVisitRequestCreate,
    PsychologistVisitRequestResponse,
    PsychologistVisitRequestAssign
)

from app.schemas.advertisement import (
    AdvertisementCreate,
    AdvertisementUpdate,
    AdvertisementResponse,
    AdvertisementClick
)

from app.schemas.coupon import (
    CouponCreate,
    CouponUpdate,
    CouponResponse,
    CouponApply,
    CouponValidateResponse,
    BulkCouponCreate
)

from app.schemas.subscription_plan import (
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionPlanResponse,
    SubscriptionPlanVisibilityUpdate
)


__all__ = [
    # User
    "UserCreate", "UserLogin", "UserResponse", "UserUpdate", "Token", "TokenData",

    # Appointment
    "AppointmentCreate", "AppointmentResponse", "AppointmentNotesUpdate",

    # Meal
    "MealCreate", "MealResponse",

    # Message
    "MessageCreate", "MessageResponse",

    # Order
    "OrderCreate", "OrderResponse", "OrderStatusUpdate",

    # Vitals
    "VitalsCreate", "VitalsResponse",

    # Visit Requests
    "CareVisitRequestCreate", "CareVisitRequestResponse", "CareVisitRequestAssign",
    "PsychologistVisitRequestCreate", "PsychologistVisitRequestResponse",
    "PsychologistVisitRequestAssign"

    "AdvertisementCreate",
    "AdvertisementUpdate", 
    "AdvertisementResponse",
    "AdvertisementClick",

     "CouponCreate", "CouponUpdate", "CouponResponse", 
    "CouponApply", "CouponValidateResponse", "BulkCouponCreate",

    "SubscriptionPlanCreate",
    "SubscriptionPlanUpdate", 
    "SubscriptionPlanResponse",
    "SubscriptionPlanVisibilityUpdate",
]
