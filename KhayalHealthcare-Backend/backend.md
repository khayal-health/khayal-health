KhayalHealthcare-Backend>
│ .dockerignore
│ .env
│ requirements.txt
│
└───app
│ main.py
│ **init**.py
│
├───config
│ database.py
│ **init**.py
│
├───models
│ meal.py
│ user.py
│ **init**.py
│
├───routers
│ admin.py
│ appointments.py
│ auth.py
│ meals.py
│ messages.py
│ orders.py
│ user.py
│ visit_requests.py
│ vitals.py
│ **init**.py
│
├───schemas
│ appointment.py
│ meal.py
│ message.py
│ order.py
│ user.py
│ visit_request.py
│ vitals.py
│ **init**.py
│
├───services
│ appointment.py
│ auth.py
│ meal.py
│ message.py
│ order.py
│ user.py
│ visit_request.py
│ vitals.py
│ **init**.py
│
└───utils
auth.py
dependencies.py
**init**.py

app\config\_\_init\_\_.py

"""Database and configuration management"""

from app.config.database import (
Database,
db,
get_database,
connect_to_mongo,
close_mongo_connection
)

**all** = [
"Database",
"db",
"get_database",
"connect_to_mongo",
"close_mongo_connection"
]

app\config\database.py

from motor.motor_asyncio import AsyncIOMotorClient
from decouple import config
import logging

logger = logging.getLogger(**name**)

class Database:
client: AsyncIOMotorClient = None
database = None

db = Database()

async def get_database() -> AsyncIOMotorClient:
return db.database

async def connect_to_mongo():
"""Create database connection"""
try:
db.client = AsyncIOMotorClient(config('MONGODB_URL'))
db.database = db.client[config('DATABASE_NAME')]

        # Test the connection
        await db.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise e

async def close_mongo_connection():
"""Close database connection"""
if db.client:
db.client.close()
logger.info("Disconnected from MongoDB")

app\models\_\_init\_\_.py

"""Data models for Khayal Healthcare application"""

from app.models.user import (
PyObjectId,
User,
UserRole,
ApprovalStatus,
SubscriptionStatus,
Vitals,
Order,
OrderStatus,
Appointment,
Message,
CareVisitRequest,
CareVisitRequestStatus,
PsychologistVisitRequest
)

**all** = [ # Core models
"User",
"Vitals",
"Order",
"Appointment",
"Message",
"CareVisitRequest",
"PsychologistVisitRequest",

    # Enums
    "UserRole",
    "ApprovalStatus",
    "SubscriptionStatus",
    "OrderStatus",
    "CareVisitRequestStatus",

    # Utilities
    "PyObjectId"

]

app\models\meal.py

from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from app.models.user import PyObjectId
from bson import ObjectId

class Meal(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
chef_id: PyObjectId
name: str
description: str
price: float
ingredients: List[str] = []
dietary_info: Optional[str] = None
meal_visibility: bool = True
created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

app\models\user.py

from enum import Enum
from pydantic_core import core_schema
from pydantic.json_schema import JsonSchemaValue
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
@classmethod
def **get_pydantic_core_schema**(
cls, source_type: Any, handler: Any
) -> core_schema.CoreSchema:
return core_schema.union_schema(
[
core_schema.is_instance_schema(cls),
core_schema.chain_schema(
[
core_schema.str_schema(),
core_schema.no_info_plain_validator_function(cls.validate),
]
)
],
serialization=core_schema.plain_serializer_function_ser_schema(
lambda x: str(x),
return_schema=core_schema.str_schema(),
),
)

    @classmethod
    def validate(cls, v):
        # Handle both string and ObjectId instances
        if isinstance(v, ObjectId):
            return cls(str(v))
        if isinstance(v, str):
            if not ObjectId.is_valid(v):
                raise ValueError("Invalid objectid")
            return cls(v)
        raise ValueError("Invalid objectid")

    @classmethod
    def __get_pydantic_json_schema__(
        cls, schema: dict[str, Any], handler: Any
    ) -> JsonSchemaValue:
        schema = handler(schema)
        schema.update(type="string")
        return schema

class UserRole(str, Enum):
ADMIN = "admin"
SUBSCRIBER = "subscriber"
CARETAKER = "caretaker"
CHEF = "chef"
PSYCHOLOGIST = "psychologist"

class ApprovalStatus(str, Enum):
APPROVED = "approved"
PENDING = "pending"
REJECTED = "rejected"

class SubscriptionStatus(str, Enum):
ACTIVE = "active"
EXPIRED = "expired"
PENDING = "pending"
CANCELLED = "cancelled"

class User(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
username: str
email: str
password: str
name: str
phone: str
role: UserRole

    # Optional fields based on role
    age: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    previous_illness: Optional[str] = None
    experience: Optional[int] = None
    degree: Optional[str] = None

    available: bool = True

    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_plan: Optional[str] = None
    subscription_expiry: Optional[datetime] = None
    subscription_renewal_date: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Vitals(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
subscriber_id: PyObjectId
caretaker_id: Optional[PyObjectId] = None
timestamp: datetime = Field(default_factory=datetime.utcnow)
heart_rate: Optional[int] = None
blood_pressure_systolic: Optional[int] = None
blood_pressure_diastolic: Optional[int] = None
temperature: Optional[float] = None
oxygen_saturation: Optional[int] = None
blood_sugar: Optional[float] = None
report_type: str = "manual"

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class OrderStatus(str, Enum):
PENDING = "pending"
CONFIRMED = "confirmed"
PREPARING = "preparing"
READY = "ready"
DELIVERED = "delivered"
CANCELLED = "cancelled"

class Order(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
subscriber_id: PyObjectId
chef_id: PyObjectId
meal_id: PyObjectId
quantity: int = 1
total_price: float
delivery_address: str
status: OrderStatus = OrderStatus.PENDING
timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Appointment(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
subscriber_id: PyObjectId
psychologist_id: PyObjectId
appointment_date: datetime
notes: Optional[str] = None
status: str = "scheduled"
created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Message(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
from_id: PyObjectId
to_id: PyObjectId
content: str
timestamp: datetime = Field(default_factory=datetime.utcnow)
read: bool = False

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class CareVisitRequestStatus(str, Enum):
PENDING = "pending"
ASSIGNED = "assigned"
ACCEPTED = "accepted"  
 IN_PROGRESS = "in_progress"
COMPLETED = "completed"
CANCELLED = "cancelled"

class CareVisitRequest(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
subscriber_id: PyObjectId
caretaker_id: Optional[PyObjectId] = None
request_type: str
description: str
preferred_date: datetime
appointment_date_time: Optional[datetime] = None
status: CareVisitRequestStatus = CareVisitRequestStatus.PENDING
created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class PsychologistVisitRequest(BaseModel):
id: Optional[PyObjectId] = Field(default=None, alias="\_id")
subscriber_id: PyObjectId
psychologist_id: Optional[PyObjectId] = None
description: str
preferred_date: datetime
appointment_date_time: Optional[datetime] = None
status: CareVisitRequestStatus = CareVisitRequestStatus.PENDING
created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

app\routers\_\_init\_\_.py

"""API route handlers"""

from app.routers import (
auth,
user,
admin,
vitals,
meals,
orders,
appointments,
messages,
visit_requests
)

# List all routers for easy registration

routers = [
auth.router,
user.router,
admin.router,
vitals.router,
meals.router,
orders.router,
appointments.router,
messages.router,
visit_requests.router
]

**all** = [
"auth",
"user",
"admin",
"vitals",
"meals",
"orders",
"appointments",
"messages",
"visit_requests",
"routers"
]

app\routers\admin.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus, SubscriptionStatus
from app.schemas.user import UserResponse, SubscriptionUpdate
from app.services.user import UserService
from app.services.order import OrderService
from app.schemas.order import OrderStatusUpdate
from app.config.database import get_database
from app.utils.dependencies import get_admin_user
import logging

router = APIRouter(
prefix="/admin",
tags=["admin"],
responses={401: {"description": "Unauthorized"}, 403: {"description": "Forbidden"}},
)

logger = logging.getLogger(**name**)

@router.get("/users/{role}", response_model=List[UserResponse])
async def get_users_by_role(
role: str,
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get users by role (admin only)"""
user_service = UserService(db)
users = await user_service.get_users_by_role(role)
return [UserResponse(**user.dict(by_alias=True)) for user in users]

@router.patch("/users/{user_id}/approval", status_code=status.HTTP_200_OK)
async def update_user_approval(
user_id: str,
approval: dict,
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update user approval status (admin only)"""
try:
approval_status = ApprovalStatus(approval.get("approval_status"))
user_service = UserService(db)
await user_service.update_user_approval_status(user_id, approval_status)
return {"message": "User approval status updated successfully"}
except ValueError:
raise HTTPException(
status_code=status.HTTP_400_BAD_REQUEST,
detail=f"Invalid approval status"
)

@router.get("/chefs", response_model=List[dict])
async def get_chef_details(
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all chefs with details (admin only)"""
from app.services.meal import MealService

    user_service = UserService(db)
    meal_service = MealService(db)

    # Get all chefs
    chefs = await user_service.get_users_by_role(UserRole.CHEF)

    # Get meals for each chef
    chefs_with_details = []
    for chef in chefs:
        meals = await meal_service.get_meals_by_chef(str(chef.id))
        chef_dict = chef.dict(by_alias=True)
        chef_dict["meals"] = [meal.dict(by_alias=True) for meal in meals]
        chef_dict["subscription_status"] = chef.subscription_status or "pending"
        chef_dict["subscription_plan"] = chef.subscription_plan or "none"
        chef_dict["available"] = chef.available
        chefs_with_details.append(chef_dict)

    return chefs_with_details

@router.get("/chef-orders", response_model=List[dict])
async def get_all_chef_orders(
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all chef orders (admin only)"""
from app.services.meal import MealService

    user_service = UserService(db)
    order_service = OrderService(db)
    meal_service = MealService(db)

    # Get all chefs
    chefs = await user_service.get_users_by_role(UserRole.CHEF)

    # Get all subscribers
    subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)

    # Get all orders
    all_orders = await order_service.get_all_orders()

    # Prepare detailed orders
    orders_with_details = []
    for order in all_orders:
        meal = await meal_service.get_meal_by_id(str(order.meal_id))
        chef = next((c for c in chefs if c.id == order.chef_id), None)
        subscriber = next((s for s in subscribers if s.id == order.subscriber_id), None)

        order_detail = order.dict(by_alias=True)
        order_detail["meal"] = meal.dict(by_alias=True) if meal else None

        if chef:
            order_detail["chef"] = {
                "id": str(chef.id),
                "name": chef.name,
                "experience": chef.experience
            }
        else:
            order_detail["chef"] = None

        if subscriber:
            order_detail["subscriber"] = {
                "id": str(subscriber.id),
                "name": subscriber.name,
                "phone": subscriber.phone
            }
        else:
            order_detail["subscriber"] = None

        orders_with_details.append(order_detail)

    return orders_with_details

@router.patch("/orders/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_order_status_admin(
order_id: str,
status_update: OrderStatusUpdate,
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update order status (admin only)"""
try:
order_service = OrderService(db)
await order_service.update_order_status(order_id, status_update.status)
return {"message": "Order status updated successfully"}
except Exception as e:
logger.error(f"Failed to update order status: {str(e)}")
raise HTTPException(
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
detail="Failed to update order status"
)

@router.get("/{role}/subscriptions", response_model=List[dict])
async def get_role_subscriptions(
role: str,
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get subscriptions for users of a specific role (admin only)"""
try: # Validate role
user_role = UserRole(role)
except ValueError:
raise HTTPException(
status_code=status.HTTP_400_BAD_REQUEST,
detail=f"Invalid role: {role}. Valid roles are: {', '.join([r.value for r in UserRole])}"
)

    user_service = UserService(db)
    users = await user_service.get_users_by_role(user_role)

    # Build response based on role
    users_with_subscriptions = []
    for user in users:
        # Only include approved users (except admins don't need approval)
        if user.approval_status == ApprovalStatus.APPROVED or user_role == UserRole.ADMIN:
            user_data = {
                "id": str(user.id),
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "phone": user.phone,
                "approval_status": user.approval_status,
                "subscription_status": user.subscription_status or "pending",
                "subscription_plan": user.subscription_plan or "none",
                "subscription_expiry": user.subscription_expiry,
                "subscription_renewal_date": user.subscription_renewal_date,
                "created_at": user.created_at
            }

            # Add role-specific fields
            if user_role == UserRole.CARETAKER:
                user_data["experience"] = user.experience
                user_data["degree"] = user.degree
            elif user_role == UserRole.CHEF:
                user_data["experience"] = user.experience
                user_data["degree"] = user.degree
            elif user_role == UserRole.PSYCHOLOGIST:
                user_data["experience"] = user.experience
                user_data["degree"] = user.degree
            elif user_role == UserRole.SUBSCRIBER:
                user_data["age"] = user.age
                user_data["address"] = user.address
                user_data["city"] = user.city
                user_data["previous_illness"] = user.previous_illness

            users_with_subscriptions.append(user_data)

    return users_with_subscriptions

@router.patch("/users/{user_id}/subscription", status_code=status.HTTP_200_OK)
async def update_user_subscription(
user_id: str,
subscription: SubscriptionUpdate,
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update user subscription details (admin only)"""
try:
user_service = UserService(db)

        # Verify user exists
        user = await user_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Update subscription
        await user_service.update_user_subscription(
            user_id,
            subscription.subscription_status,
            subscription.subscription_plan,
            subscription.subscription_expiry,
            subscription.subscription_renewal_date
        )

        return {
            "message": "User subscription updated successfully",
            "user_id": user_id,
            "updated_subscription": {
                "status": subscription.subscription_status,
                "plan": subscription.subscription_plan,
                "expiry": subscription.subscription_expiry,
                "renewal_date": subscription.subscription_renewal_date
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update subscription for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subscription: {str(e)}"
        )

# Add a new endpoint to get all users with subscription info

@router.get("/subscriptions/all", response_model=dict)
async def get_all_subscriptions(
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get subscription info for all users grouped by role (admin only)"""
user_service = UserService(db)

    all_subscriptions = {}

    for role in UserRole:
        users = await user_service.get_users_by_role(role)
        role_subscriptions = []

        for user in users:
            if user.approval_status == ApprovalStatus.APPROVED or role == UserRole.ADMIN:
                role_subscriptions.append({
                    "id": str(user.id),
                    "name": user.name,
                    "username": user.username,
                    "subscription_status": user.subscription_status or "pending",
                    "subscription_plan": user.subscription_plan or "none",
                    "subscription_expiry": user.subscription_expiry,
                    "subscription_renewal_date": user.subscription_renewal_date
                })

        all_subscriptions[role.value] = role_subscriptions

    return all_subscriptions

app\routers\appointments.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentNotesUpdate
from app.services.appointment import AppointmentService
from app.config.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(
prefix="/appointments",
tags=["appointments"],
responses={401: {"description": "Unauthorized"}},
)

@router.get("/psychologist/{psychologist_id}", response_model=List[AppointmentResponse])
async def get_appointments_by_psychologist(
psychologist_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get appointments for a specific psychologist"""
appointment_service = AppointmentService(db)
appointments = await appointment_service.get_appointments_by_psychologist(psychologist_id)
return [appointment.dict(by_alias=True) for appointment in appointments]

@router.get("/subscriber/{subscriber_id}", response_model=List[AppointmentResponse])
async def get_appointments_by_subscriber(
subscriber_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get appointments for a specific subscriber"""
appointment_service = AppointmentService(db)
appointments = await appointment_service.get_appointments_by_subscriber(subscriber_id)
return [appointment.dict(by_alias=True) for appointment in appointments]

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
appointment_data: AppointmentCreate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Create new appointment"""
appointment_service = AppointmentService(db)
appointment = await appointment_service.create_appointment(appointment_data)
return appointment.dict(by_alias=True)

@router.patch("/{appointment_id}/notes", status_code=status.HTTP_200_OK)
async def update_appointment_notes(
appointment_id: str,
notes_update: AppointmentNotesUpdate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update appointment notes"""
appointment_service = AppointmentService(db)
await appointment_service.update_appointment_notes(appointment_id, notes_update.notes)
return {"message": "Appointment notes updated successfully"}

app\routers\auth.py

from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.services.auth import AuthService
from app.services.user import UserService
from app.config.database import get_database
import logging

router = APIRouter(
prefix="/auth",
tags=["authentication"],
responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(**name**)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
"""Register a new user"""
try:
logger.info(f"Registration attempt for username: {user_data.username}")
user_service = UserService(db)

        # Check if username exists
        existing_user = await user_service.get_user_by_username(user_data.username)
        if existing_user:
            logger.warning(f"Registration failed - username exists: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{user_data.username}' is already taken. Please choose a different username."
            )

        # Check if email exists
        existing_email = await user_service.get_user_by_email(user_data.email)
        if existing_email:
            logger.warning(f"Registration failed - email exists: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_data.email}' is already registered. Please use a different email."
            )

        # Create user
        user = await user_service.create_user(user_data)
        logger.info(f"User registered successfully: {user.id}")

        # Convert to response model
        user_dict = user.dict(by_alias=True)
        return UserResponse(**user_dict)

    except ValueError as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user account: {str(e)}"
        )

@router.post("/login")
async def login(user_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
"""Authenticate user and return access token with user data"""
try:
logger.info(f"Login attempt for username: {user_data.username}")
auth_service = AuthService(db)
result = await auth_service.login_user(user_data)
logger.info(f"Login successful for user: {user_data.username}")
return result
except HTTPException:
logger.warning(f"Login failed for user: {user_data.username}")
raise
except Exception as e:
logger.error(f"Login error: {str(e)}")
raise HTTPException(
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
detail=f"Login error: {str(e)}"
)

app\routers\meals.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole
from app.schemas.meal import MealCreate, MealResponse
from app.services.meal import MealService
from app.config.database import get_database
from app.utils.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(
prefix="/meals",
tags=["meals"],
responses={401: {"description": "Unauthorized"}},
)

class MealVisibilityUpdate(BaseModel):
meal_visibility: bool

@router.get("/my-meals", response_model=List[MealResponse])
async def get_my_meals(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get meals for the authenticated chef""" # Validate that current user is a chef
if current_user.role != UserRole.CHEF:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Only chefs can access their meals"
)

    meal_service = MealService(db)
    meals = await meal_service.get_meals_by_chef(str(current_user.id))
    return [meal.dict(by_alias=True) for meal in meals]

@router.get("/chef/{chef_id}", response_model=List[MealResponse])
async def get_meals_by_chef(
chef_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get meals for a specific chef (for subscribers/admin viewing)"""
meal_service = MealService(db)
meals = await meal_service.get_meals_by_chef(chef_id)
return [meal.dict(by_alias=True) for meal in meals]

@router.get("/all", response_model=List[dict])
async def get_all_meals(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all meals from all chefs with chef details"""
from app.services.user import UserService

    meal_service = MealService(db)
    user_service = UserService(db)

    # Get all chefs
    chefs = await user_service.get_users_by_role(UserRole.CHEF)

    # Get all meals
    all_meals = []
    for chef in chefs:
        if chef.approval_status == "approved":  # Only show meals from approved chefs
            meals = await meal_service.get_meals_by_chef(str(chef.id))
            for meal in meals:
                meal_dict = meal.dict(by_alias=True)
                meal_dict["chef"] = {
                    "id": str(chef.id),
                    "name": chef.name,
                    "experience": chef.experience,
                    "degree": chef.degree
                }
                all_meals.append(meal_dict)

    return all_meals

@router.post("", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_meal(
meal_data: MealCreate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Create new meal (chef only)""" # Validate that current user is a chef
if current_user.role != UserRole.CHEF:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Only chefs can create meals"
)

    # Auto-assign chef_id from authenticated user
    meal_service = MealService(db)
    meal = await meal_service.create_meal(meal_data, str(current_user.id))
    return meal.dict(by_alias=True)

@router.put("/{meal_id}", response_model=MealResponse)
async def update_meal(
meal_id: str,
meal_data: MealCreate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update meal (chef only, own meals)"""
if current_user.role != UserRole.CHEF:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Only chefs can update meals"
)

    meal_service = MealService(db)

    # Check if meal belongs to the chef
    existing_meal = await meal_service.get_meal_by_id(meal_id)
    if not existing_meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )

    if str(existing_meal.chef_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own meals"
        )

    # Update the meal
    updated_meal = await meal_service.update_meal(meal_id, meal_data)
    return updated_meal.dict(by_alias=True)

@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal(
meal_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Delete meal (chef only, own meals)"""
if current_user.role != UserRole.CHEF:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Only chefs can delete meals"
)

    meal_service = MealService(db)

    # Check if meal belongs to the chef
    existing_meal = await meal_service.get_meal_by_id(meal_id)
    if not existing_meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )

    if str(existing_meal.chef_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own meals"
        )

    # Delete the meal
    await meal_service.delete_meal(meal_id)
    return None

@router.get("/chefs-with-meals", response_model=List[dict])
async def get_chefs_with_meals(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):

    if current_user.role is not UserRole.SUBSCRIBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only subscribers and chefs can access this endpoint"
        )

    from app.services.user import UserService

    meal_service = MealService(db)
    user_service = UserService(db)

    chefs = await user_service.get_users_by_role(UserRole.CHEF)
    chefs_with_meals = []

    for chef in chefs:
        if chef.approval_status == "approved":
            meals = await meal_service.get_meals_by_chef(str(chef.id))
            formatted_meals = []
            for meal in meals:
                if meal.meal_visibility:
                    meal_dict = meal.dict(by_alias=True)
                    formatted_meals.append(meal_dict)

            chef_data = {
                "id": str(chef.id),
                "name": chef.name,
                "experience": chef.experience,
                "degree": chef.degree,
                "meals": formatted_meals
            }

            chefs_with_meals.append(chef_data)

    return chefs_with_meals

@router.patch("/{meal_id}/visibility", response_model=MealResponse)
async def update_meal_visibility(
meal_id: str,
visibility_update: MealVisibilityUpdate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update meal visibility"""
meal_service = MealService(db)
updated_meal = await meal_service.update_meal_visibility(meal_id, visibility_update.meal_visibility)

    if not updated_meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found or could not be updated"
        )

    return updated_meal.dict(by_alias=True)

app\routers\orders.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.services.order import OrderService
from app.services.user import UserService
from app.services.meal import MealService
from app.config.database import get_database
from app.utils.dependencies import get_current_user
import logging

router = APIRouter(
prefix="/orders",
tags=["orders"],
responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(**name**)

@router.get("/chef/my-orders", response_model=List[dict])
async def get_orders_by_chef(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get orders for the currently logged-in chef"""
try: # Verify that the current user is a chef
if current_user.role != UserRole.CHEF:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Access restricted to chefs only"
)

        # Use the current user's ID as the chef_id
        chef_id = str(current_user.id)

        order_service = OrderService(db)
        user_service = UserService(db)
        meal_service = MealService(db)

        # Get orders for the chef
        orders = await order_service.get_orders_by_chef(chef_id)

        # Get all subscribers
        subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)

        # Add subscriber and meal details to each order
        orders_with_details = []
        for order in orders:
            order_dict = order.dict(by_alias=True)

            # Convert subscriber_id to string for comparison
            subscriber_id_str = str(order.subscriber_id)

            # Find matching subscriber
            subscriber = None
            for s in subscribers:
                if str(s.id) == subscriber_id_str:
                    subscriber = s
                    break

            if subscriber:
                order_dict["subscriber"] = {
                    "name": subscriber.name,
                    "phone": subscriber.phone,
                    "address": subscriber.address,
                    "city": subscriber.city,
                    "previous_illness": subscriber.previous_illness
                }
            else:
                order_dict["subscriber"] = None

            # Get meal details
            try:
                meal = await meal_service.get_meal_by_id(str(order.meal_id))
                if meal:
                    order_dict["meal"] = meal.dict(by_alias=True)
                else:
                    order_dict["meal"] = None
            except Exception as e:
                logger.warning(f"Failed to get meal details for meal_id {order.meal_id}: {str(e)}")
                order_dict["meal"] = None

            orders_with_details.append(order_dict)

        return orders_with_details

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_orders_by_chef: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get orders: {str(e)}"
        )

@router.get("/my-orders", response_model=List[dict])
async def get_my_orders(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get orders for the currently logged-in subscriber"""
try: # Check if the current user is a subscriber
if current_user.role != UserRole.SUBSCRIBER:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Only subscribers can view their orders"
)

        # Use the current user's ID
        subscriber_id = str(current_user.id)

        order_service = OrderService(db)
        meal_service = MealService(db)
        user_service = UserService(db)

        # Get orders for the subscriber
        orders = await order_service.get_orders_by_subscriber(subscriber_id)

        # Get all chefs
        chefs = await user_service.get_users_by_role(UserRole.CHEF)

        # Add chef and meal details to each order
        orders_with_details = []
        for order in orders:
            order_dict = order.dict(by_alias=True)

            # Find matching chef
            chef = None
            for c in chefs:
                if str(c.id) == str(order.chef_id):
                    chef = c
                    break

            if chef:
                order_dict["chef"] = {
                    "id": str(chef.id),
                    "name": chef.name,
                    "experience": chef.experience,
                    "degree": chef.degree
                }
            else:
                order_dict["chef"] = None

            # Get meal details
            try:
                meal = await meal_service.get_meal_by_id(str(order.meal_id))
                if meal:
                    order_dict["meal"] = meal.dict(by_alias=True)
                else:
                    order_dict["meal"] = None
            except Exception as e:
                logger.warning(f"Failed to get meal details for meal_id {order.meal_id}: {str(e)}")
                order_dict["meal"] = None

            orders_with_details.append(order_dict)

        return orders_with_details

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_my_orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get orders: {str(e)}"
        )

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_order(
order_data: OrderCreate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Create new order"""
order_service = OrderService(db)
meal_service = MealService(db)
user_service = UserService(db)

    try:
        # Validate ObjectIds
        for field, value in [("subscriber_id", order_data.subscriber_id),
                           ("chef_id", order_data.chef_id),
                           ("meal_id", order_data.meal_id)]:
            if not ObjectId.is_valid(value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid {field} format: {value}"
                )

        order = await order_service.create_order(order_data)

        # Get related data
        meal = await meal_service.get_meal_by_id(str(order.meal_id))
        chef = await user_service.get_user_by_id(str(order.chef_id))

        # Return complete order details
        return {
            "order": order.dict(by_alias=True),
            "meal": meal.dict(by_alias=True) if meal else None,
            "chef": {
                "id": str(chef.id),
                "name": chef.name,
                "experience": chef.experience,
                "degree": chef.degree
            } if chef else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create order: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )

@router.patch("/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_order_status(
order_id: str,
status_update: OrderStatusUpdate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update order status"""
try: # Validate order_id is a valid ObjectId
if not ObjectId.is_valid(order_id):
raise HTTPException(
status_code=status.HTTP_400_BAD_REQUEST,
detail=f"Invalid order ID format: {order_id}"
)

        order_service = OrderService(db)
        await order_service.update_order_status(order_id, status_update.status)
        return {"message": "Order status updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update order status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        )

app\routers\user.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.user import UserResponse, ChefAvailabilityUpdate
from app.models.user import User, UserRole
from app.services.user import UserService
from app.config.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(
prefix="/users",
tags=["users"],
responses={401: {"description": "Unauthorized"}},
)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
"""Get current authenticated user info"""
return UserResponse(\*\*current_user.dict(by_alias=True))

@router.get("/subscribers", response_model=List[dict])
async def get_subscribers(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get a list of all subscribers (basic info)"""
user_service = UserService(db)
subscribers = await user_service.get_subscribers_summary()
return subscribers

@router.patch("/user/availability", response_model=UserResponse)
async def update_chef_availability(
availability_update: ChefAvailabilityUpdate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
user_service = UserService(db)

    updated_user = await user_service.update_chef_availability(
        str(current_user.id),
        availability_update.available
    )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update availability"
        )

    return UserResponse(**updated_user.dict(by_alias=True))

@router.get("/caretaker/assigned-subscribers", response_model=List[dict])
async def get_assigned_subscribers_for_caretaker(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get list of subscribers assigned to the current caretaker with in_progress status""" # Verify the current user is a caretaker
if current_user.role != UserRole.CARETAKER:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Access restricted to caretakers only"
)

    from app.services.visit_request import VisitRequestService
    from app.models.user import CareVisitRequestStatus

    user_service = UserService(db)
    visit_request_service = VisitRequestService(db)

    # Get all care visit requests for this caretaker with in_progress status
    all_requests = await visit_request_service.get_care_visit_requests_by_caretaker(str(current_user.id))

    # Filter only in_progress requests
    in_progress_requests = [
        req for req in all_requests
        if req.status == CareVisitRequestStatus.IN_PROGRESS
    ]

    # Get unique subscriber IDs
    subscriber_ids = list(set([str(req.subscriber_id) for req in in_progress_requests]))

    # Get subscriber details
    subscribers = []
    for sub_id in subscriber_ids:
        subscriber = await user_service.get_user_by_id(sub_id)
        if subscriber:
            subscribers.append({
                "id": str(subscriber.id),
                "name": subscriber.name
            })

    return subscribers

app\routers\visit_requests.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus
from app.schemas.visit_request import (
CareVisitRequestCreate, CareVisitRequestResponse, CareVisitRequestAssign,
PsychologistVisitRequestCreate, PsychologistVisitRequestResponse, PsychologistVisitRequestAssign
)
from app.services.visit_request import VisitRequestService
from app.services.user import UserService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
from app.models.user import UserRole, CareVisitRequestStatus

router = APIRouter(
prefix="/visit-requests",
tags=["visit requests"],
responses={401: {"description": "Unauthorized"}},
)

# Care Visit Requests

@router.post("/care", response_model=CareVisitRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_care_visit_request(
request_data: CareVisitRequestCreate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Create new care visit request"""
visit_request_service = VisitRequestService(db)
request = await visit_request_service.create_care_visit_request(request_data)
return request.dict(by_alias=True)

@router.get("/care/subscriber/{subscriber_id}", response_model=List[dict])
async def get_care_visit_requests_by_subscriber(
subscriber_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get care visit requests for a specific subscriber"""
visit_request_service = VisitRequestService(db)
user_service = UserService(db)

    requests = await visit_request_service.get_care_visit_requests_by_subscriber(subscriber_id)
    caretakers = await user_service.get_users_by_role(UserRole.CARETAKER)

    # Add caretaker details to requests
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)

        # Find caretaker details if assigned
        if request.caretaker_id:
            caretaker = next((c for c in caretakers if c.id == request.caretaker_id), None)
            request_dict["caretaker"] = caretaker.dict(by_alias=True) if caretaker else None
        else:
            request_dict["caretaker"] = None

        requests_with_details.append(request_dict)

    return requests_with_details

@router.get("/care", response_model=List[dict])
async def get_all_care_visit_requests(
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all care visit requests (admin only)"""
visit_request_service = VisitRequestService(db)
user_service = UserService(db)

    requests = await visit_request_service.get_all_care_visit_requests()
    subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)
    caretakers = await user_service.get_users_by_role(UserRole.CARETAKER)

    # Add subscriber and caretaker details
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)

        # Find subscriber details
        subscriber = next((s for s in subscribers if s.id == request.subscriber_id), None)
        request_dict["subscriber"] = subscriber.dict(by_alias=True) if subscriber else None

        # Find caretaker details if assigned
        if request.caretaker_id:
            caretaker = next((c for c in caretakers if c.id == request.caretaker_id), None)
            request_dict["caretaker"] = caretaker.dict(by_alias=True) if caretaker else None
        else:
            request_dict["caretaker"] = None

        requests_with_details.append(request_dict)

    return requests_with_details

@router.patch("/care/{request_id}/assign", status_code=status.HTTP_200_OK)
async def assign_caretaker_to_request(
request_id: str,
assignment: CareVisitRequestAssign,
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Assign caretaker to visit request (admin only)"""
try:
visit_request_service = VisitRequestService(db)
await visit_request_service.assign_caretaker(
request_id,
assignment.caretaker_id,
assignment.appointment_date_time # Add this parameter
)
return {"message": "Caretaker assigned successfully"}
except ValueError as e:
raise HTTPException(
status_code=status.HTTP_400_BAD_REQUEST,
detail=str(e)
)

# Psychologist Visit Requests

@router.post("/psychologist", response_model=PsychologistVisitRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_psychologist_visit_request(
request_data: PsychologistVisitRequestCreate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Create new psychologist visit request"""
visit_request_service = VisitRequestService(db)
request = await visit_request_service.create_psychologist_visit_request(request_data)
return request.dict(by_alias=True)

@router.get("/psychologist/subscriber/{subscriber_id}", response_model=List[dict])
async def get_psychologist_visit_requests_by_subscriber(
subscriber_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get psychologist visit requests for a specific subscriber"""
visit_request_service = VisitRequestService(db)
user_service = UserService(db)

    requests = await visit_request_service.get_psychologist_visit_requests_by_subscriber(subscriber_id)
    psychologists = await user_service.get_users_by_role(UserRole.PSYCHOLOGIST)

    # Add psychologist details to requests
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)

        # Find psychologist details if assigned
        if request.psychologist_id:
            psychologist = next((p for p in psychologists if p.id == request.psychologist_id), None)
            request_dict["psychologist"] = psychologist.dict(by_alias=True) if psychologist else None
        else:
            request_dict["psychologist"] = None

        requests_with_details.append(request_dict)

    return requests_with_details

@router.get("/psychologist", response_model=List[dict])
async def get_all_psychologist_visit_requests(
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all psychologist visit requests (admin only)"""
visit_request_service = VisitRequestService(db)
user_service = UserService(db)

    requests = await visit_request_service.get_all_psychologist_visit_requests()
    subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)
    psychologists = await user_service.get_users_by_role(UserRole.PSYCHOLOGIST)

    # Add subscriber and psychologist details
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)

        # Find subscriber details
        subscriber = next((s for s in subscribers if s.id == request.subscriber_id), None)
        request_dict["subscriber"] = subscriber.dict(by_alias=True) if subscriber else None

        # Find psychologist details if assigned
        if request.psychologist_id:
            psychologist = next((p for p in psychologists if p.id == request.psychologist_id), None)
            request_dict["psychologist"] = psychologist.dict(by_alias=True) if psychologist else None
        else:
            request_dict["psychologist"] = None

        requests_with_details.append(request_dict)

    return requests_with_details

@router.patch("/psychologist/{request_id}/assign", status_code=status.HTTP_200_OK)
async def assign_psychologist_to_request(
request_id: str,
assignment: PsychologistVisitRequestAssign,
admin_user: User = Depends(get_admin_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Assign psychologist to visit request (admin only)"""
try:
visit_request_service = VisitRequestService(db)
await visit_request_service.assign_psychologist(
request_id,
assignment.psychologist_id,
assignment.appointment_date_time
)
return {"message": "Psychologist assigned successfully"}
except ValueError as e:
raise HTTPException(
status_code=status.HTTP_400_BAD_REQUEST,
detail=str(e)
)

@router.get("/caretakers", response_model=List[dict])
async def get_available_caretakers(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all approved caretakers"""
user_service = UserService(db)
caretakers = await user_service.get_users_by_role(UserRole.CARETAKER)

    # Filter for approved caretakers only
    available_caretakers = []
    for caretaker in caretakers:
        if caretaker.approval_status == ApprovalStatus.APPROVED:
            available_caretakers.append({
                "id": str(caretaker.id),
                "name": caretaker.name,
                "experience": caretaker.experience,
                "email": caretaker.email,
                "phone": caretaker.phone,
                "subscription_status": caretaker.subscription_status or "pending"
            })

    return available_caretakers

@router.get("/psychologists", response_model=List[dict])
async def get_available_psychologists(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all approved psychologists"""
user_service = UserService(db)
psychologists = await user_service.get_users_by_role(UserRole.PSYCHOLOGIST)

    # Filter for approved psychologists only
    available_psychologists = []
    for psychologist in psychologists:
        if psychologist.approval_status == ApprovalStatus.APPROVED:
            available_psychologists.append({
                "id": str(psychologist.id),
                "name": psychologist.name,
                "experience": psychologist.experience,
                "degree": psychologist.degree,
                "phone": psychologist.phone,
                "email": psychologist.email,
                "subscription_status": psychologist.subscription_status or "pending"
            })

    return available_psychologists

@router.get("/care/caretaker/assignments", response_model=List[dict])
async def get_caretaker_assignments(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all assignments for the current caretaker with subscriber details""" # Verify user is a caretaker
if current_user.role != UserRole.CARETAKER:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Access restricted to caretakers only"
)

    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)

    # Get assignments for this caretaker
    assignments = await visit_request_service.get_care_visit_requests_by_caretaker(str(current_user.id))

    # Get subscriber details
    subscriber_ids = list(set([req.subscriber_id for req in assignments]))
    subscribers = []
    for sub_id in subscriber_ids:
        subscriber = await user_service.get_user_by_id(str(sub_id))
        if subscriber:
            subscribers.append(subscriber)

    # Build response with subscriber details
    assignments_with_details = []
    for assignment in assignments:
        assignment_dict = assignment.dict(by_alias=True)

        # Find subscriber details
        subscriber = next((s for s in subscribers if str(s.id) == str(assignment.subscriber_id)), None)
        if subscriber:
            assignment_dict["subscriber"] = {
                "id": str(subscriber.id),
                "name": subscriber.name,
                "phone": subscriber.phone,
                "email": subscriber.email,
                "address": subscriber.address,
                "city": subscriber.city,
                "age": subscriber.age,
                "previous_illness": subscriber.previous_illness
            }
        else:
            assignment_dict["subscriber"] = None

        assignments_with_details.append(assignment_dict)

    return assignments_with_details

@router.patch("/care/{request_id}/caretaker-status", status_code=status.HTTP_200_OK)
async def update_care_request_status_by_caretaker(
request_id: str,
status_update: dict,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update care visit request status by caretaker (accept, cancel, in_progress, completed)""" # Verify user is a caretaker
if current_user.role != UserRole.CARETAKER:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Access restricted to caretakers only"
)

    # Validate status
    new_status = status_update.get("status")
    allowed_statuses = ["accepted", "cancelled", "in_progress", "completed"]

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Allowed values: {', '.join(allowed_statuses)}"
        )

    visit_request_service = VisitRequestService(db)

    # Verify the request is assigned to this caretaker
    request = await visit_request_service.get_care_visit_request_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Care visit request not found"
        )

    if str(request.caretaker_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update requests assigned to you"
        )

    # Update status
    try:
        status_enum = CareVisitRequestStatus(new_status)
        await visit_request_service.update_care_visit_status(request_id, status_enum)

        return {
            "message": f"Care visit request status updated to {new_status}",
            "request_id": request_id,
            "new_status": new_status
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )

@router.get("/psychologist/psychologist/assignments", response_model=List[dict])
async def get_psychologist_assignments(
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get all assignments for the current psychologist with subscriber details""" # Verify user is a psychologist
if current_user.role != UserRole.PSYCHOLOGIST:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Access restricted to psychologists only"
)

    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)

    # Get assignments for this psychologist
    assignments = await visit_request_service.get_psychologist_visit_requests_by_psychologist(str(current_user.id))

    # Get subscriber details
    subscriber_ids = list(set([req.subscriber_id for req in assignments]))
    subscribers = []
    for sub_id in subscriber_ids:
        subscriber = await user_service.get_user_by_id(str(sub_id))
        if subscriber:
            subscribers.append(subscriber)

    # Build response with subscriber details
    assignments_with_details = []
    for assignment in assignments:
        assignment_dict = assignment.dict(by_alias=True)

        # Find subscriber details
        subscriber = next((s for s in subscribers if str(s.id) == str(assignment.subscriber_id)), None)
        if subscriber:
            assignment_dict["subscriber"] = {
                "id": str(subscriber.id),
                "name": subscriber.name,
                "phone": subscriber.phone,
                "email": subscriber.email,
                "address": subscriber.address,
                "city": subscriber.city,
                "age": subscriber.age,
                "previous_illness": subscriber.previous_illness
            }
        else:
            assignment_dict["subscriber"] = None

        assignments_with_details.append(assignment_dict)

    return assignments_with_details

@router.patch("/psychologist/{request_id}/psychologist-status", status_code=status.HTTP_200_OK)
async def update_psychologist_request_status_by_psychologist(
request_id: str,
status_update: dict,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Update psychologist visit request status by psychologist (accept, cancel, in_progress, completed)""" # Verify user is a psychologist
if current_user.role != UserRole.PSYCHOLOGIST:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Access restricted to psychologists only"
)

    # Validate status
    new_status = status_update.get("status")
    allowed_statuses = ["accepted", "cancelled", "in_progress", "completed"]

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Allowed values: {', '.join(allowed_statuses)}"
        )

    visit_request_service = VisitRequestService(db)

    # Verify the request is assigned to this psychologist
    request = await visit_request_service.get_psychologist_visit_request_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Psychologist visit request not found"
        )

    if str(request.psychologist_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update requests assigned to you"
        )
    try:
        status_enum = CareVisitRequestStatus(new_status)
        await visit_request_service.update_psychologist_visit_status(request_id, status_enum)

        return {
            "message": f"Psychologist visit request status updated to {new_status}",
            "request_id": request_id,
            "new_status": new_status
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )

app\routers\vitals.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.vitals import VitalsCreate, VitalsResponse
from app.services.vitals import VitalsService
from app.services.user import UserService
from app.config.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(
prefix="/vitals",
tags=["vitals"],
responses={401: {"description": "Unauthorized"}},
)

@router.get("/{subscriber_id}", response_model=List[VitalsResponse])
async def get_vitals_by_subscriber(
subscriber_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get vitals for a specific subscriber"""
vitals_service = VitalsService(db)
user_service = UserService(db)

    # Get vitals
    vitals = await vitals_service.get_vitals_by_subscriber(subscriber_id)

    # Get all caretakers for adding names
    caretakers = await user_service.get_users_by_role("caretaker")

    # Add caretaker name to each vital record
    vitals_with_caretakers = []
    for vital in vitals:
        vital_dict = vital.dict(by_alias=True)

        # Find caretaker name
        caretaker_name = None
        if vital.caretaker_id:
            caretaker = next((c for c in caretakers if c.id == vital.caretaker_id), None)
            caretaker_name = caretaker.name if caretaker else "Unknown"

        vital_dict["caretaker_name"] = caretaker_name
        vitals_with_caretakers.append(vital_dict)

    return vitals_with_caretakers

@router.get("/self/{subscriber_id}", response_model=List[VitalsResponse])
async def get_self_vitals_by_subscriber(
subscriber_id: str,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Get self-reported vitals for a specific subscriber"""
vitals_service = VitalsService(db)
vitals = await vitals_service.get_self_vitals_by_subscriber(subscriber_id)
return [vital.dict(by_alias=True) for vital in vitals]

@router.post("", response_model=VitalsResponse, status_code=status.HTTP_201_CREATED)
async def create_vitals(
vitals_data: VitalsCreate,
current_user: User = Depends(get_current_user),
db: AsyncIOMotorDatabase = Depends(get_database)
):
"""Create new vitals record"""
vitals_service = VitalsService(db)
vitals = await vitals_service.create_vitals(vitals_data)
return vitals.dict(by_alias=True)

app\schemas\_\_init\_\_.py

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

**all** = [ # User
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

]

app\schemas\appointment.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class AppointmentCreate(BaseModel):
subscriber_id: str
psychologist_id: str
appointment_date: datetime
notes: Optional[str] = None

class AppointmentResponse(BaseModel):
id: str = Field(alias="\_id")
subscriber_id: str
psychologist_id: str
appointment_date: datetime
notes: Optional[str] = None
status: str
created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class AppointmentNotesUpdate(BaseModel):
notes: str

app\models\meal.py

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class MealCreate(BaseModel):
name: str
description: str
price: float
ingredients: List[str] = []
dietary_info: Optional[str] = None
meal_visibility: bool = True

class MealResponse(BaseModel):
id: str = Field(alias="\_id")
chef_id: str
name: str
description: str
price: float
ingredients: List[str]
dietary_info: Optional[str] = None
meal_visibility: bool
created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

app\schemas\message.py

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class MessageCreate(BaseModel):
from_id: str
to_id: str
content: str

class MessageResponse(BaseModel):
id: str = Field(alias="\_id")
from_id: str
to_id: str
content: str
timestamp: datetime
read: bool

    model_config = ConfigDict(populate_by_name=True)

app\schemas\order.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import OrderStatus

class OrderCreate(BaseModel):
subscriber_id: str
chef_id: str
meal_id: str
quantity: int = 1
total_price: float
delivery_address: str

class OrderResponse(BaseModel):
id: str = Field(alias="\_id")
subscriber_id: str
chef_id: str
meal_id: str
quantity: int
total_price: float
delivery_address: str
status: OrderStatus
timestamp: datetime

    model_config = ConfigDict(populate_by_name=True)

class OrderStatusUpdate(BaseModel):
status: OrderStatus

app\schemas\user.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
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
id: str = Field(alias="\_id")
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
subscription_plan: Optional[str] = None
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
subscription_plan: str
subscription_expiry: datetime
subscription_renewal_date: Optional[datetime] = None

app\schemas\visit_request.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import CareVisitRequestStatus

class CareVisitRequestCreate(BaseModel):
subscriber_id: str
request_type: str
description: str
preferred_date: datetime

class CareVisitRequestResponse(BaseModel):
id: str = Field(alias="\_id")
subscriber_id: str
caretaker_id: Optional[str] = None
request_type: str
description: str
preferred_date: datetime
appointment_date_time: Optional[datetime] = None  
 status: CareVisitRequestStatus
created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class CareVisitRequestAssign(BaseModel):
caretaker_id: str
appointment_date_time: datetime

class PsychologistVisitRequestCreate(BaseModel):
subscriber_id: str
description: str
preferred_date: datetime

class PsychologistVisitRequestResponse(BaseModel):
id: str = Field(alias="\_id")
subscriber_id: str
psychologist_id: Optional[str] = None
description: str
preferred_date: datetime
appointment_date_time: Optional[datetime] = None
status: CareVisitRequestStatus
created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class PsychologistVisitRequestAssign(BaseModel):
psychologist_id: str
appointment_date_time: datetime

class CareVisitRequestStatusUpdate(BaseModel):
status: CareVisitRequestStatus

app\services\_\_init\_\_.py

"""Business logic services"""

from app.services.appointment import AppointmentService
from app.services.auth import AuthService
from app.services.meal import MealService
from app.services.message import MessageService
from app.services.order import OrderService
from app.services.user import UserService
from app.services.visit_request import VisitRequestService
from app.services.vitals import VitalsService

**all** = [
"AppointmentService",
"AuthService",
"MealService",
"MessageService",
"OrderService",
"UserService",
"VisitRequestService",
"VitalsService"
]

app\services\appointment.py

from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Appointment
from app.schemas.appointment import AppointmentCreate
from datetime import datetime

class AppointmentService:
def **init**(self, db: AsyncIOMotorDatabase):
self.db = db
self.collection = db.appointments

    async def create_appointment(self, appointment_data: AppointmentCreate) -> Appointment:
        """Create new appointment"""
        appointment_dict = appointment_data.dict()
        appointment_dict['subscriber_id'] = ObjectId(appointment_data.subscriber_id)
        appointment_dict['psychologist_id'] = ObjectId(appointment_data.psychologist_id)
        appointment_dict['status'] = "scheduled"
        appointment_dict['created_at'] = datetime.utcnow()

        result = await self.collection.insert_one(appointment_dict)
        appointment_dict['_id'] = result.inserted_id

        return Appointment(**appointment_dict)

    async def get_appointments_by_psychologist(self, psychologist_id: str) -> List[Appointment]:
        """Get all appointments for a psychologist"""
        cursor = self.collection.find({"psychologist_id": ObjectId(psychologist_id)})
        appointments = []
        async for appointment_doc in cursor:
            appointments.append(Appointment(**appointment_doc))
        return appointments

    async def get_appointments_by_subscriber(self, subscriber_id: str) -> List[Appointment]:
        """Get all appointments for a subscriber"""
        cursor = self.collection.find({"subscriber_id": ObjectId(subscriber_id)})
        appointments = []
        async for appointment_doc in cursor:
            appointments.append(Appointment(**appointment_doc))
        return appointments

    async def update_appointment_notes(self, appointment_id: str, notes: str):
        """Update appointment notes"""
        await self.collection.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {"notes": notes}}
        )

app\services\auth.py

from datetime import timedelta
from fastapi import HTTPException, status
from app.utils.auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.services.user import UserService
from app.schemas.user import UserLogin, Token

class AuthService:
def **init**(self, db):
self.db = db
self.user_service = UserService(db)

    async def authenticate_user(self, username: str, password: str):
        """Authenticate user with username and password"""
        user = await self.user_service.get_user_by_username(username)
        if not user:
            return False
        if not verify_password(password, user.password):
            return False
        return user

    async def login_user(self, user_data: UserLogin):
        """Login user and return access token with user data"""
        user = await self.authenticate_user(user_data.username, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )

        # Return both token and user data
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user.dict(by_alias=True)
        }

app\services\meal.py

from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.meal import Meal
from app.schemas.meal import MealCreate
from datetime import datetime

class MealService:
def **init**(self, db: AsyncIOMotorDatabase):
self.db = db
self.collection = db.meals

    async def create_meal(self, meal_data: MealCreate, chef_id: str) -> Meal:
        """Create new meal"""
        meal_dict = meal_data.dict()
        meal_dict['chef_id'] = ObjectId(chef_id)  # Store as ObjectId in DB
        meal_dict['created_at'] = datetime.utcnow()

        result = await self.collection.insert_one(meal_dict)

        # Convert ObjectId to string for Pydantic model
        meal_dict['_id'] = str(result.inserted_id)
        meal_dict['chef_id'] = str(meal_dict['chef_id'])

        return Meal(**meal_dict)

    async def get_meals_by_chef(self, chef_id: str) -> List[Meal]:
        """Get all meals for a chef"""
        cursor = self.collection.find({"chef_id": ObjectId(chef_id)})
        meals = []
        async for meal_doc in cursor:
            # Convert ObjectId fields to strings
            meal_doc['_id'] = str(meal_doc['_id'])
            meal_doc['chef_id'] = str(meal_doc['chef_id'])
            meals.append(Meal(**meal_doc))
        return meals

    async def get_meal_by_id(self, meal_id: str) -> Optional[Meal]:
        """Get meal by ID"""
        try:
            meal_doc = await self.collection.find_one({"_id": ObjectId(meal_id)})
            if meal_doc:
                # Convert ObjectId fields to strings
                meal_doc['_id'] = str(meal_doc['_id'])
                meal_doc['chef_id'] = str(meal_doc['chef_id'])
                return Meal(**meal_doc)
            return None
        except:
            return None

    async def update_meal(self, meal_id: str, meal_data: MealCreate) -> Optional[Meal]:
        """Update meal"""
        try:
            update_dict = meal_data.dict()
            update_dict['updated_at'] = datetime.utcnow()

            result = await self.collection.update_one(
                {"_id": ObjectId(meal_id)},
                {"$set": update_dict}
            )

            if result.modified_count > 0:
                return await self.get_meal_by_id(meal_id)
            return None
        except:
            return None

    async def delete_meal(self, meal_id: str) -> bool:
        """Delete meal"""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(meal_id)})
            return result.deleted_count > 0
        except:
            return False

    async def get_all_meals(self) -> List[Meal]:
        """Get all meals"""
        cursor = self.collection.find()
        meals = []
        async for meal_doc in cursor:
            # Convert ObjectId fields to strings
            meal_doc['_id'] = str(meal_doc['_id'])
            meal_doc['chef_id'] = str(meal_doc['chef_id'])
            meals.append(Meal(**meal_doc))
        return meals

    async def update_meal_visibility(self, meal_id: str, visibility: bool) -> Optional[Meal]:
        """Update meal visibility"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(meal_id)},
                {"$set": {"meal_visibility": visibility}}
            )

            if result.modified_count > 0:
                return await self.get_meal_by_id(meal_id)
            return None
        except:
            return None

app\services\message.py

from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Message
from app.schemas.message import MessageCreate
from datetime import datetime

class MessageService:
def **init**(self, db: AsyncIOMotorDatabase):
self.db = db
self.collection = db.messages

    async def create_message(self, message_data: MessageCreate) -> Message:
        """Create new message"""
        message_dict = message_data.dict()
        message_dict['from_id'] = ObjectId(message_data.from_id)
        message_dict['to_id'] = ObjectId(message_data.to_id)
        message_dict['timestamp'] = datetime.utcnow()
        message_dict['read'] = False

        result = await self.collection.insert_one(message_dict)
        message_dict['_id'] = result.inserted_id

        return Message(**message_dict)

    async def get_messages_for_user(self, user_id: str) -> List[Message]:
        """Get all messages for a user (sent or received)"""
        user_oid = ObjectId(user_id)
        cursor = self.collection.find({
            "$or": [{"from_id": user_oid}, {"to_id": user_oid}]
        }).sort("timestamp", 1)

        messages = []
        async for message_doc in cursor:
            messages.append(Message(**message_doc))
        return messages

app\services\order.py

from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Order, OrderStatus
from app.schemas.order import OrderCreate
from datetime import datetime

class OrderService:
def **init**(self, db: AsyncIOMotorDatabase):
self.db = db
self.collection = db.orders

    async def create_order(self, order_data: OrderCreate) -> Order:
        """Create new order"""
        order_dict = order_data.dict()
        order_dict['subscriber_id'] = ObjectId(order_data.subscriber_id)
        order_dict['chef_id'] = ObjectId(order_data.chef_id)
        order_dict['meal_id'] = ObjectId(order_data.meal_id)
        order_dict['status'] = OrderStatus.PENDING
        order_dict['timestamp'] = datetime.utcnow()

        result = await self.collection.insert_one(order_dict)

        # Convert ObjectIds to strings for Pydantic model
        order_dict['_id'] = str(result.inserted_id)
        order_dict['subscriber_id'] = str(order_dict['subscriber_id'])
        order_dict['chef_id'] = str(order_dict['chef_id'])
        order_dict['meal_id'] = str(order_dict['meal_id'])

        return Order(**order_dict)

    async def get_orders_by_chef(self, chef_id: str) -> List[Order]:
        """Get all orders for a chef"""
        cursor = self.collection.find({"chef_id": ObjectId(chef_id)})
        orders = []
        async for order_doc in cursor:
            # Convert ObjectId to string for all id fields
            order_doc['_id'] = str(order_doc['_id'])
            order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
            order_doc['chef_id'] = str(order_doc['chef_id'])
            order_doc['meal_id'] = str(order_doc['meal_id'])
            orders.append(Order(**order_doc))
        return orders

    async def get_orders_by_subscriber(self, subscriber_id: str) -> List[Order]:
        """Get all orders for a subscriber"""
        cursor = self.collection.find({"subscriber_id": ObjectId(subscriber_id)})
        orders = []
        async for order_doc in cursor:
            # Convert ObjectId to string for all id fields
            order_doc['_id'] = str(order_doc['_id'])
            order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
            order_doc['chef_id'] = str(order_doc['chef_id'])
            order_doc['meal_id'] = str(order_doc['meal_id'])
            orders.append(Order(**order_doc))
        return orders

    async def get_all_orders(self) -> List[Order]:
        """Get all orders (admin)"""
        cursor = self.collection.find()
        orders = []
        async for order_doc in cursor:
            # Convert ObjectId to string for all id fields
            order_doc['_id'] = str(order_doc['_id'])
            order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
            order_doc['chef_id'] = str(order_doc['chef_id'])
            order_doc['meal_id'] = str(order_doc['meal_id'])
            orders.append(Order(**order_doc))
        return orders

    async def update_order_status(self, order_id: str, status: OrderStatus):
        """Update order status"""
        await self.collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )

    async def get_order_by_id(self, order_id: str):
        """Get order by ID"""
        try:
            order_doc = await self.collection.find_one({"_id": ObjectId(order_id)})
            if order_doc:
                # Convert ObjectId to string for all id fields
                order_doc['_id'] = str(order_doc['_id'])
                order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
                order_doc['chef_id'] = str(order_doc['chef_id'])
                order_doc['meal_id'] = str(order_doc['meal_id'])
                return Order(**order_doc)
            return None
        except:
            return None

app\services\user.py

from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus, SubscriptionStatus
from app.schemas.user import UserCreate, UserUpdate
from app.utils.auth import get_password_hash
from datetime import datetime

class UserService:
def **init**(self, db: AsyncIOMotorDatabase):
self.db = db
self.collection = db.users

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if username already exists
        existing_user = await self.get_user_by_username(user_data.username)
        if existing_user:
            raise ValueError(f"Username '{user_data.username}' is already taken")

        # Check if email already exists
        existing_email = await self.get_user_by_email(user_data.email)
        if existing_email:
            raise ValueError(f"Email '{user_data.email}' is already registered")

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Create user document
        user_dict = user_data.dict()
        user_dict['password'] = hashed_password
        user_dict['approval_status'] = ApprovalStatus.PENDING
        user_dict['created_at'] = datetime.utcnow()
        user_dict['updated_at'] = datetime.utcnow()

        # Add default values for subscribers
        if user_data.role == UserRole.SUBSCRIBER:
            if not user_dict.get('address'):
                user_dict['address'] = "Default Address"
            if not user_dict.get('city'):
                user_dict['city'] = "Default City"

        # Pad phone number if needed
        if len(user_dict['phone']) < 10:
            user_dict['phone'] = user_dict['phone'].ljust(10, '0')

        result = await self.collection.insert_one(user_dict)

        # Convert ObjectId to string for Pydantic model
        user_dict['_id'] = str(result.inserted_id)

        return User(**user_dict)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        user_doc = await self.collection.find_one({"email": email})
        if user_doc:
            user_doc['_id'] = str(user_doc['_id'])
            return User(**user_doc)
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user_doc = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user_doc:
                user_doc['_id'] = str(user_doc['_id'])
                return User(**user_doc)
            return None
        except:
            return None

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        user_doc = await self.collection.find_one({"username": username})
        if user_doc:
            user_doc['_id'] = str(user_doc['_id'])
            return User(**user_doc)
        return None

    async def get_users_by_role(self, role: str) -> List[User]:
        """Get all users by role"""
        cursor = self.collection.find({"role": role})
        users = []
        async for user_doc in cursor:
            user_doc['_id'] = str(user_doc['_id'])
            users.append(User(**user_doc))
        return users

    async def update_user_approval_status(self, user_id: str, status: ApprovalStatus):
        """Update user approval status"""
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"approval_status": status, "updated_at": datetime.utcnow()}}
        )

    async def get_subscribers_summary(self) -> List[dict]:
        """Get subscribers with basic info"""
        cursor = self.collection.find(
            {"role": UserRole.SUBSCRIBER},
            {"_id": 1, "name": 1}
        )
        subscribers = []
        async for user_doc in cursor:
            subscribers.append({
                "id": str(user_doc["_id"]),
                "name": user_doc["name"]
            })
        return subscribers

    async def update_chef_availability(self, user_id: str, available: bool) -> Optional[User]:
        """Update chef availability"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id), "role": UserRole.CHEF},
                {
                    "$set": {
                        "available": available,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                return await self.get_user_by_id(user_id)
            return None
        except Exception as e:
            return None

    async def update_user_subscription(
        self,
        user_id: str,
        status: SubscriptionStatus,
        plan: str,
        expiry_date: datetime,
        renewal_date: Optional[datetime] = None
    ):
        """Update user subscription"""
        update_data = {
            "subscription_status": status,
            "subscription_plan": plan,
            "subscription_expiry": expiry_date,
            "updated_at": datetime.utcnow()
        }

        update_data["subscription_renewal_date"] = renewal_date or expiry_date

        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

app\services\visit_request.py

from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import CareVisitRequest, PsychologistVisitRequest, CareVisitRequestStatus
from app.schemas.visit_request import CareVisitRequestCreate, PsychologistVisitRequestCreate
from datetime import datetime

class VisitRequestService:
def **init**(self, db: AsyncIOMotorDatabase):
self.db = db
self.care_visits = db.care_visit_requests
self.psych_visits = db.psychologist_visit_requests

    # Care Visit Requests
    async def create_care_visit_request(self, request_data: CareVisitRequestCreate) -> CareVisitRequest:
        """Create new care visit request"""
        request_dict = request_data.dict()
        request_dict['subscriber_id'] = ObjectId(request_data.subscriber_id)
        request_dict['status'] = CareVisitRequestStatus.PENDING
        request_dict['created_at'] = datetime.utcnow()

        result = await self.care_visits.insert_one(request_dict)

        # Convert ObjectId to string for Pydantic model
        request_dict['_id'] = str(result.inserted_id)
        request_dict['subscriber_id'] = str(request_dict['subscriber_id'])

        return CareVisitRequest(**request_dict)

    async def get_all_care_visit_requests(self) -> List[CareVisitRequest]:
        """Get all care visit requests (admin)"""
        cursor = self.care_visits.find()
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('caretaker_id'):
                request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
            requests.append(CareVisitRequest(**request_doc))
        return requests

    async def get_care_visit_requests_by_subscriber(self, subscriber_id: str) -> List[CareVisitRequest]:
        """Get care visit requests for a specific subscriber"""
        cursor = self.care_visits.find({"subscriber_id": ObjectId(subscriber_id)})
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('caretaker_id'):
                request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
            requests.append(CareVisitRequest(**request_doc))
        return requests

    async def assign_caretaker(self, request_id: str, caretaker_id: str, appointment_datetime: datetime):
        """Assign caretaker to visit request with appointment time"""
        # Validate ObjectIds first
        if not ObjectId.is_valid(request_id):
            raise ValueError(f"Invalid request ID: {request_id}")

        if not ObjectId.is_valid(caretaker_id):
            raise ValueError(f"Invalid caretaker ID: {caretaker_id}")

        await self.care_visits.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "caretaker_id": ObjectId(caretaker_id),
                    "appointment_date_time": appointment_datetime,  # Add this field
                    "status": CareVisitRequestStatus.ASSIGNED
                }
            }
        )


    async def update_care_visit_status(self, request_id: str, status: CareVisitRequestStatus):
        """Update care visit request status"""
        await self.care_visits.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": status}}
        )

    # Psychologist Visit Requests
    async def create_psychologist_visit_request(self, request_data: PsychologistVisitRequestCreate) -> PsychologistVisitRequest:
        """Create new psychologist visit request"""
        request_dict = request_data.dict()
        request_dict['subscriber_id'] = ObjectId(request_data.subscriber_id)
        request_dict['status'] = CareVisitRequestStatus.PENDING
        request_dict['created_at'] = datetime.utcnow()

        result = await self.psych_visits.insert_one(request_dict)

        # Convert ObjectId to string for Pydantic model
        request_dict['_id'] = str(result.inserted_id)
        request_dict['subscriber_id'] = str(request_dict['subscriber_id'])

        return PsychologistVisitRequest(**request_dict)

    async def get_all_psychologist_visit_requests(self) -> List[PsychologistVisitRequest]:
        """Get all psychologist visit requests (admin)"""
        cursor = self.psych_visits.find()
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('psychologist_id'):
                request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
            requests.append(PsychologistVisitRequest(**request_doc))
        return requests

    async def get_psychologist_visit_requests_by_subscriber(self, subscriber_id: str) -> List[PsychologistVisitRequest]:
        """Get psychologist visit requests for a specific subscriber"""
        cursor = self.psych_visits.find({"subscriber_id": ObjectId(subscriber_id)})
        requests = []
        async for request_doc in cursor:
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('psychologist_id'):
                request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
            requests.append(PsychologistVisitRequest(**request_doc))
        return requests

    async def assign_psychologist(self, request_id: str, psychologist_id: str, appointment_datetime: datetime):
        """Assign psychologist to visit request"""
        # Validate ObjectIds first
        if not ObjectId.is_valid(request_id):
            raise ValueError(f"Invalid request ID: {request_id}")

        if not ObjectId.is_valid(psychologist_id):
            raise ValueError(f"Invalid psychologist ID: {psychologist_id}")

        await self.psych_visits.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "psychologist_id": ObjectId(psychologist_id),
                    "appointment_date_time": appointment_datetime,
                    "status": CareVisitRequestStatus.ASSIGNED
                }
            }
        )

    async def update_psychologist_visit_status(self, request_id: str, status: CareVisitRequestStatus):
        """Update psychologist visit request status"""
        await self.psych_visits.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": status}}
        )

    async def get_care_visit_requests_by_caretaker(self, caretaker_id: str) -> List[CareVisitRequest]:
        """Get all care visit requests assigned to a specific caretaker"""
        cursor = self.care_visits.find({"caretaker_id": ObjectId(caretaker_id)})
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('caretaker_id'):
                request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
            requests.append(CareVisitRequest(**request_doc))
        return requests

    async def get_care_visit_request_by_id(self, request_id: str) -> Optional[CareVisitRequest]:
        """Get a specific care visit request by ID"""
        try:
            request_doc = await self.care_visits.find_one({"_id": ObjectId(request_id)})
            if request_doc:
                # Convert ObjectId fields to strings
                request_doc['_id'] = str(request_doc['_id'])
                request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
                if request_doc.get('caretaker_id'):
                    request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
                return CareVisitRequest(**request_doc)
            return None
        except:
            return None

    async def get_psychologist_visit_requests_by_psychologist(self, psychologist_id: str) -> List[PsychologistVisitRequest]:
        """Get all psychologist visit requests assigned to a specific psychologist"""
        cursor = self.psych_visits.find({"psychologist_id": ObjectId(psychologist_id)})
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('psychologist_id'):
                request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
            requests.append(PsychologistVisitRequest(**request_doc))
        return requests

    async def get_psychologist_visit_request_by_id(self, request_id: str) -> Optional[PsychologistVisitRequest]:
        """Get a specific psychologist visit request by ID"""
        try:
            request_doc = await self.psych_visits.find_one({"_id": ObjectId(request_id)})
            if request_doc:
                # Convert ObjectId fields to strings
                request_doc['_id'] = str(request_doc['_id'])
                request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
                if request_doc.get('psychologist_id'):
                    request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
                return PsychologistVisitRequest(**request_doc)
            return None
        except:
            return None

app\services\vitals.py

from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Vitals
from app.schemas.vitals import VitalsCreate
from datetime import datetime

class VitalsService:
def **init**(self, db: AsyncIOMotorDatabase):
self.db = db
self.collection = db.vitals

    async def create_vitals(self, vitals_data: VitalsCreate) -> Vitals:
        """Create new vitals record"""
        vitals_dict = vitals_data.dict()
        vitals_dict['subscriber_id'] = ObjectId(vitals_data.subscriber_id)
        if vitals_data.caretaker_id:
            vitals_dict['caretaker_id'] = ObjectId(vitals_data.caretaker_id)
        vitals_dict['timestamp'] = datetime.utcnow()

        result = await self.collection.insert_one(vitals_dict)

        # Convert ObjectId fields to strings for Pydantic model
        vitals_dict['_id'] = str(result.inserted_id)
        vitals_dict['subscriber_id'] = str(vitals_dict['subscriber_id'])
        if vitals_dict.get('caretaker_id'):
            vitals_dict['caretaker_id'] = str(vitals_dict['caretaker_id'])

        return Vitals(**vitals_dict)

    async def get_vitals_by_subscriber(self, subscriber_id: str) -> List[Vitals]:
        """Get all vitals for a subscriber"""
        cursor = self.collection.find({"subscriber_id": ObjectId(subscriber_id)})
        vitals = []
        async for vitals_doc in cursor:
            # Convert ObjectId fields to strings
            vitals_doc['_id'] = str(vitals_doc['_id'])
            vitals_doc['subscriber_id'] = str(vitals_doc['subscriber_id'])
            if vitals_doc.get('caretaker_id'):
                vitals_doc['caretaker_id'] = str(vitals_doc['caretaker_id'])
            vitals.append(Vitals(**vitals_doc))
        return vitals

    async def get_self_vitals_by_subscriber(self, subscriber_id: str) -> List[Vitals]:
        """Get self-reported vitals for a subscriber"""
        cursor = self.collection.find({
            "subscriber_id": ObjectId(subscriber_id),
            "report_type": {"$in": ["self", "remote-ppg"]}
        })
        vitals = []
        async for vitals_doc in cursor:
            # Convert ObjectId fields to strings
            vitals_doc['_id'] = str(vitals_doc['_id'])
            vitals_doc['subscriber_id'] = str(vitals_doc['subscriber_id'])
            if vitals_doc.get('caretaker_id'):
                vitals_doc['caretaker_id'] = str(vitals_doc['caretaker_id'])
            vitals.append(Vitals(**vitals_doc))
        return vitals

app\utils\_\_init\_\_.py

"""Utility functions and dependencies"""

from app.utils.auth import (
verify_password,
get_password_hash,
create_access_token,
verify_token,
SECRET_KEY,
ALGORITHM,
ACCESS_TOKEN_EXPIRE_MINUTES
)

from app.utils.dependencies import (
get_current_user,
get_admin_user,
security
)

**all** = [ # Auth utilities
"verify_password",
"get_password_hash",
"create_access_token",
"verify_token",

    # Dependencies
    "get_current_user",
    "get_admin_user",
    "security",

    # Constants (use with caution)
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES"

]

app\utils\auth.py

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from decouple import config

SECRET_KEY = config('SECRET_KEY')
ALGORITHM = config('ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(config('ACCESS_TOKEN_EXPIRE_MINUTES'))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
"""Verify a password against its hash""" # Handle both plain text (legacy) and hashed passwords
if '.' in hashed_password: # This is a hashed password
return pwd_context.verify(plain_password, hashed_password)
else: # This is a plain text password (legacy support)
return plain_password == hashed_password

def get_password_hash(password: str) -> str:
"""Hash a password"""
return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
"""Create JWT access token"""
to_encode = data.copy()
if expires_delta:
expire = datetime.utcnow() + expires_delta
else:
expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
"""Verify JWT token and return username"""
try:
payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
username: str = payload.get("sub")
if username is None:
return None
return username
except JWTError:
return None

app\utils\dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.auth import verify_token
from app.services.user import UserService
from app.models.user import User, UserRole
from app.config.database import get_database

security = HTTPBearer()

async def get_current_user(
credentials: HTTPAuthorizationCredentials = Depends(security),
db = Depends(get_database)
) -> User:
"""Get current authenticated user"""
token = credentials.credentials
username = verify_token(token)

    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_service = UserService(db)
    user = await user_service.get_user_by_username(username)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
"""Ensure current user is admin"""
if current_user.role != UserRole.ADMIN:
raise HTTPException(
status_code=status.HTTP_403_FORBIDDEN,
detail="Admin access required"
)
return current_user

app\_\_init\_\_.py

"""
Khayal Healthcare Backend Application
A comprehensive health and wellness platform
"""

**version** = "1.0.0"
**author** = "Khayal Healthcare Team"

# This makes the app accessible as `from app import create_app`

from app.main import app

**all** = ["app"]

app\main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os
from pathlib import Path
from app.config.database import connect_to_mongo, close_mongo_connection
from app.routers import (
auth, user, admin, vitals, meals, orders, appointments, messages, visit_requests
)

# Set up logging

logging.basicConfig(
level=logging.INFO,
format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(**name**)

# Create FastAPI app

app = FastAPI(
title="Khayal API",
description="API for the Khayal health and wellness application",
version="1.0.0",
)

# Set up CORS

app.add_middleware(
CORSMiddleware,
allow_origins=["*"], # In production, replace with specific origins
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)

# Database connection events

app.add_event_handler("startup", connect_to_mongo)
app.add_event_handler("shutdown", close_mongo_connection)

# Include routers - all API routes are prefixed with /api

app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(vitals.router, prefix="/api")
app.include_router(meals.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(visit_requests.router, prefix="/api")

# Serve static files if they exist (production mode)

static_dir = Path("static")
if static_dir.exists() and static_dir.is_dir(): # Mount static files at /assets path
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    # Catch-all route to serve the React app
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Don't catch API routes
        if full_path.startswith("api/"):
            return {"detail": "Not found"}

        # Serve index.html for all non-API routes
        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path)

        return {"detail": "Frontend not found"}

# Health check endpoint

@app.get("/api/health")
def health_check():
return {"status": "healthy"}

if **name** == "**main**":
import uvicorn
port = int(os.environ.get("PORT", 8000))
uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
.env

MONGODB_URL=mongodb+srv://noman:2xTLMDSy@cluster0.akzsxic.mongodb.net/
DATABASE_NAME=khayal_app
SECRET_KEY=your-secret-key-here-make-it-long-and-secure
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=144
