# Khayal Healthcare Backend Documentation

Generated from: `C:\Users\Noman\Desktop\khayal-health`

---

## Table of Contents

- **KhayalHealthcare-Backend/**
  - **app/**
    - **config/**
      - [__init__.py](#--init--)
      - [database.py](#database)
    - **models/**
      - [__init__.py](#--init--)
      - [advertisement.py](#advertisement)
      - [coupon.py](#coupon)
      - [meal.py](#meal)
      - [subscription_plan.py](#subscription-plan)
      - [user.py](#user)
      - [verification.py](#verification)
    - **routers/**
      - [__init__.py](#--init--)
      - [admin.py](#admin)
      - [advertisements.py](#advertisements)
      - [appointments.py](#appointments)
      - [auth.py](#auth)
      - [coupons.py](#coupons)
      - [meals.py](#meals)
      - [messages.py](#messages)
      - [orders.py](#orders)
      - [subscription_plans.py](#subscription-plans)
      - [user.py](#user)
      - [visit_requests.py](#visit-requests)
      - [vitals.py](#vitals)
    - **schemas/**
      - [__init__.py](#--init--)
      - [advertisement.py](#advertisement)
      - [appointment.py](#appointment)
      - [coupon.py](#coupon)
      - [meal.py](#meal)
      - [message.py](#message)
      - [order.py](#order)
      - [subscription_plan.py](#subscription-plan)
      - [user.py](#user)
      - [verification.py](#verification)
      - [visit_request.py](#visit-request)
      - [vitals.py](#vitals)
    - **services/**
      - [__init__.py](#--init--)
      - [advertisement.py](#advertisement)
      - [appointment.py](#appointment)
      - [auth.py](#auth)
      - [coupon.py](#coupon)
      - [meal.py](#meal)
      - [message.py](#message)
      - [notification.py](#notification)
      - [order.py](#order)
      - [subscription_plan.py](#subscription-plan)
      - [user.py](#user)
      - [verification.py](#verification)
      - [visit_request.py](#visit-request)
      - [vitals.py](#vitals)
    - **utils/**
      - [__init__.py](#--init--)
      - [auth.py](#auth)
      - [cleanup.py](#cleanup)
      - [dependencies.py](#dependencies)
      - [initial_setup.py](#initial-setup)
    - [__init__.py](#--init--)
    - [main.py](#main)
  - [documentation.py](#documentation)

---

## KhayalHealthcare-Backend/app/__init__.py

```python
"""
Khayal Healthcare Backend Application
A comprehensive health and wellness platform
"""

__version__ = "1.0.0"
__author__ = "Khayal Healthcare Team"

# This makes the app accessible as `from app import create_app`
from app.main import app

__all__ = ["app"]
```

## KhayalHealthcare-Backend/app/config/__init__.py

```python
"""Database and configuration management"""

from app.config.database import (
    Database,
    db,
    get_database,
    connect_to_mongo,
    close_mongo_connection
)

__all__ = [
    "Database",
    "db",
    "get_database",
    "connect_to_mongo",
    "close_mongo_connection"
]
```

## KhayalHealthcare-Backend/app/config/database.py

```python
from motor.motor_asyncio import AsyncIOMotorClient
from decouple import config
import logging

logger = logging.getLogger(__name__)

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
```

## KhayalHealthcare-Backend/app/main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
import logging
import os
import json
from pathlib import Path
import asyncio
from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.routers import (
    auth, user, admin, vitals, meals, orders, appointments, messages, visit_requests, advertisements, coupons, subscription_plans
)
from app.utils.cleanup import cleanup_expired_verifications
from app.utils.initial_setup import create_default_admins  # Add this import

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Khayal API",
    description="API for the Khayal health and wellness application",
    version="1.0.0",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add startup event to create default admins
async def startup_event():
    """Handle all startup tasks"""
    # Connect to MongoDB
    await connect_to_mongo()
    
    # Create default admin users if needed
    db = await get_database()
    await create_default_admins(db)

# Database connection events
app.add_event_handler("startup", startup_event)
app.add_event_handler("shutdown", close_mongo_connection)

# Include routers (rest of your router includes remain the same)
app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(vitals.router, prefix="/api")
app.include_router(meals.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(visit_requests.router, prefix="/api")
app.include_router(advertisements.router, prefix="/api")
app.include_router(coupons.router, prefix="/api")
app.include_router(subscription_plans.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

# IMPORTANT: Mount uploads directory BEFORE any catch-all routes
uploads_dir = Path("uploads")
if uploads_dir.exists() and uploads_dir.is_dir():
    logger.info(f"Uploads directory found at {uploads_dir.absolute()}")
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
else:
    logger.warning(f"Uploads directory not found at {uploads_dir.absolute()}")
    # Create uploads directory if it doesn't exist
    uploads_dir.mkdir(exist_ok=True)
    (uploads_dir / "advertisements").mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve static files
static_dir = Path("static")
if static_dir.exists() and static_dir.is_dir():
    logger.info(f"Static directory found at {static_dir.absolute()}")
    
    # Mount static assets
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
    
    # Serve favicon
    @app.get("/favicon.svg")
    async def favicon():
        favicon_path = static_dir / "favicon.svg"
        if favicon_path.exists():
            return FileResponse(favicon_path, media_type="image/svg+xml")
        return JSONResponse({"error": "favicon not found"}, status_code=404)
    
    # Serve manifest.json with proper content type and validation
    @app.get("/manifest.json")
    async def manifest():
        manifest_path = static_dir / "manifest.json"
        if manifest_path.exists():
            try:
                # Validate JSON before serving
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    manifest_data = json.load(f)
                return JSONResponse(
                    content=manifest_data,
                    media_type="application/manifest+json",
                    headers={
                        "Cache-Control": "public, max-age=604800",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in manifest.json: {e}")
                return JSONResponse({"error": "Invalid manifest JSON"}, status_code=500)
        return JSONResponse({"error": "manifest not found"}, status_code=404)
    
    # Serve other static files
    @app.get("/{filename:path}")
    async def serve_static_files(filename: str):
        # Skip API routes
        if filename.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        
        # Skip uploads routes - they're handled by the mounted StaticFiles
        if filename.startswith("uploads/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        
        # Check for specific static files
        file_path = static_dir / filename
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # For all other routes, serve index.html (SPA routing)
        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path, media_type="text/html")
        
        return HTMLResponse("<h1>Frontend not found</h1>", status_code=404)

else:
    logger.warning("Static directory not found - running in development mode")
    
    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        # Skip API routes
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        
        # Skip uploads routes - they're handled by the mounted StaticFiles
        if full_path.startswith("uploads/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
            
        return {"message": "Frontend not built. Run 'npm run build' in frontend directory."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
```

## KhayalHealthcare-Backend/app/models/__init__.py

```python
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

from app.models.coupon import (
    Coupon,
    CouponUsage,
    CouponType,
    CouponStatus
)

from app.models.advertisement import Advertisement, AdvertisementStatus

from app.models.subscription_plan import (
    SubscriptionPlan,
    PlanType,
    PlanTier,
    BillingCycle,
    NumericValues,
    BillingInfo
)

from app.models.verification import (
    VerificationCode,
    VerificationType,
    VerificationMethod,
    VerificationStatus,
    AccountRestriction
)

__all__ = [
    # Core models
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
    "PyObjectId",
    "Advertisement",
    "AdvertisementStatus",

    "Coupon",
    "CouponUsage",
    "CouponType",
    "CouponStatus",

    "SubscriptionPlan",
    "PlanType", 
    "PlanTier",
    "BillingCycle",
    "NumericValues",
    "BillingInfo",
    
    # Verification
    "VerificationCode",
    "VerificationType",
    "VerificationMethod",
    "VerificationStatus",
    "AccountRestriction"
]
```

## KhayalHealthcare-Backend/app/models/advertisement.py

```python
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
```

## KhayalHealthcare-Backend/app/models/coupon.py

```python
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
```

## KhayalHealthcare-Backend/app/models/meal.py

```python
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from app.models.user import PyObjectId
from bson import ObjectId

class Meal(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
```

## KhayalHealthcare-Backend/app/models/subscription_plan.py

```python
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
```

## KhayalHealthcare-Backend/app/models/user.py

```python
from enum import Enum
from pydantic_core import core_schema
from pydantic.json_schema import JsonSchemaValue
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any,List
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
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
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
    subscription_plans: Optional[List[str]] = Field(default_factory=list)
    subscription_expiry: Optional[datetime] = None
    subscription_renewal_date: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    email_verified: bool = False
    phone_verified: bool = False
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True, 
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class Vitals(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
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
```

## KhayalHealthcare-Backend/app/models/verification.py

```python
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.user import PyObjectId
from bson import ObjectId

class VerificationType(str, Enum):
    REGISTRATION = "registration"
    PASSWORD_RESET = "password_reset"

class VerificationMethod(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    BOTH = "both"

class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"

class VerificationCode(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: Optional[PyObjectId] = None  # Optional for registration
    email: str
    phone: str
    username: Optional[str] = None  # For registration
    code: str
    type: VerificationType
    method: VerificationMethod
    status: VerificationStatus = VerificationStatus.PENDING
    attempts: int = 0
    last_sent_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # For tracking resend attempts
    resend_count: int = 0
    last_resend_at: Optional[datetime] = None
    
    # User data for registration (stored temporarily)
    registration_data: Optional[dict] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class AccountRestriction(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: str
    phone: str
    restriction_type: str = "excessive_attempts"
    restricted_until: datetime
    reason: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
```

## KhayalHealthcare-Backend/app/routers/__init__.py

```python
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
    visit_requests,
    advertisements,
    coupons,
    subscription_plans,
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
    visit_requests.router,
    advertisements.router,
    coupons.router,
    subscription_plans.router,
]

__all__ = [
    "auth",
    "user",
    "admin",
    "vitals",
    "meals",
    "orders",
    "appointments",
    "messages",
    "visit_requests",
    "routers",
    "advertisements",
    "coupons",
    "subscription_plans"
]
```

## KhayalHealthcare-Backend/app/routers/admin.py

```python
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

logger = logging.getLogger(__name__)

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
        chef_dict["subscription_plans"] = chef.subscription_plans or []
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
    try:
        # Validate role
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
                "subscription_plan": user.subscription_plans or [] ,
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
            subscription.subscription_plans,
            subscription.subscription_expiry,
            subscription.subscription_renewal_date
        )

        return {
            "message": "User subscription updated successfully",
            "user_id": user_id,
            "updated_subscription": {
                "status": subscription.subscription_status,
                "plans": subscription.subscription_plans,
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
```

## KhayalHealthcare-Backend/app/routers/advertisements.py

```python
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole
from app.models.advertisement import AdvertisementStatus
from app.schemas.advertisement import (
    AdvertisementCreate, 
    AdvertisementUpdate, 
    AdvertisementResponse,
    AdvertisementClick
)
from app.services.advertisement import AdvertisementService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
from datetime import datetime
import os
import shutil
from pathlib import Path
import uuid
import logging

router = APIRouter(
    prefix="/advertisements",
    tags=["advertisements"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/advertisements")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

def validate_image(filename: str) -> bool:
    """Validate image file extension"""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

@router.post("", response_model=AdvertisementResponse, status_code=status.HTTP_201_CREATED)
async def create_advertisement(
    title: str = Form(...),
    description: str = Form(...),
    message: str = Form(...),
    target_role: UserRole = Form(...),
    display_order: int = Form(0),
    start_date: datetime = Form(...),
    end_date: datetime = Form(...),
    image: UploadFile = File(...),
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new advertisement (admin only)"""
    # Validate image
    if not image.filename or not validate_image(image.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPEG and PNG are allowed."
        )
    
    # Validate dates
    if start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    try:
        # Generate unique filename
        file_extension = Path(image.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        # Create advertisement data
        ad_data = AdvertisementCreate(
            title=title,
            description=description,
            message=message,
            target_role=target_role,
            display_order=display_order,
            start_date=start_date,
            end_date=end_date
        )
        
        # Save to database
        ad_service = AdvertisementService(db)
        advertisement = await ad_service.create_advertisement(
            ad_data, 
            str(file_path),
            str(admin_user.id)
        )
        
        return advertisement.dict(by_alias=True)
        
    except Exception as e:
        # Clean up file if database save fails
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        
        logger.error(f"Failed to create advertisement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create advertisement: {str(e)}"
        )

@router.get("/all", response_model=List[AdvertisementResponse])
async def get_all_advertisements(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all advertisements (admin only)"""
    ad_service = AdvertisementService(db)
    ads = await ad_service.get_all_advertisements()
    return [ad.dict(by_alias=True) for ad in ads]

@router.get("/my-ads", response_model=List[AdvertisementResponse])
async def get_my_advertisements(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get advertisements for current user's role"""
    ad_service = AdvertisementService(db)
    
    # Update expired ads first
    await ad_service.update_expired_advertisements()
    
    # Get ads for user's role
    ads = await ad_service.get_advertisements_by_role(current_user.role)
    
    # Increment view count for each ad
    for ad in ads:
        await ad_service.increment_view_count(str(ad.id))
    
    return [ad.dict(by_alias=True) for ad in ads]

@router.get("/{ad_id}", response_model=AdvertisementResponse)
async def get_advertisement(
    ad_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get specific advertisement"""
    ad_service = AdvertisementService(db)
    ad = await ad_service.get_advertisement_by_id(ad_id)
    
    if not ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Check if user can view this ad
    if current_user.role != UserRole.ADMIN and ad.target_role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this advertisement"
        )
    
    return ad.dict(by_alias=True)

@router.put("/{ad_id}", response_model=AdvertisementResponse)
async def update_advertisement(
    ad_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    target_role: Optional[UserRole] = Form(None),
    status: Optional[AdvertisementStatus] = Form(None),
    display_order: Optional[int] = Form(None),
    start_date: Optional[datetime] = Form(None),
    end_date: Optional[datetime] = Form(None),
    image: Optional[UploadFile] = File(None),
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update advertisement (admin only)"""
    ad_service = AdvertisementService(db)
    
    # Get existing ad
    existing_ad = await ad_service.get_advertisement_by_id(ad_id)
    if not existing_ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found"
        )
    
    # Handle image update
    image_path = None
    if image and image.filename:
        if not validate_image(image.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format. Only JPEG and PNG are allowed."
            )
        
        try:
            # Delete old image
            if existing_ad.image_url and os.path.exists(existing_ad.image_url):
                os.remove(existing_ad.image_url)
            
            # Save new image
            file_extension = Path(image.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_path = str(file_path)
            
        except Exception as e:
            logger.error(f"Failed to update image: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update image"
            )
    
    # Create update data
    update_data = AdvertisementUpdate()
    if title is not None:
        update_data.title = title
    if description is not None:
        update_data.description = description
    if message is not None:
        update_data.message = message
    if target_role is not None:
        update_data.target_role = target_role
    if status is not None:
        update_data.status = status
    if display_order is not None:
        update_data.display_order = display_order
    if start_date is not None:
        update_data.start_date = start_date
    if end_date is not None:
        update_data.end_date = end_date
    
    # Validate dates if both provided
    if start_date and end_date and start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    # Update advertisement
    updated_ad = await ad_service.update_advertisement(ad_id, update_data, image_path)
    
    if not updated_ad:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update advertisement"
        )
    
    return updated_ad.dict(by_alias=True)

@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_advertisement(
    ad_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete advertisement (admin only)"""
    ad_service = AdvertisementService(db)
    
    success = await ad_service.delete_advertisement(ad_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertisement not found or could not be deleted"
        )
    
    return None
```

## KhayalHealthcare-Backend/app/routers/appointments.py

```python
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
```

## KhayalHealthcare-Backend/app/routers/auth.py

```python
from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.schemas.verification import (
    VerificationCodeVerify, ResendCodeRequest, 
    PasswordResetRequest, PasswordResetVerify,
    VerificationCodeResponse
)
from app.services.auth import AuthService
from app.services.user import UserService
from app.services.verification import VerificationService
from app.models.verification import VerificationType, VerificationMethod
from app.config.database import get_database
import logging
from datetime import datetime
from bson import ObjectId

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

@router.post("/register", response_model=VerificationCodeResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Register a new user - sends verification code"""
    try:
        logger.info(f"Registration attempt for username: {user_data.username}")
        user_service = UserService(db)
        verification_service = VerificationService(db)
        
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
        
        # Create verification code and store registration data
        from app.schemas.verification import VerificationCodeCreate
        verification_data = VerificationCodeCreate(
            email=user_data.email,
            phone=user_data.phone,
            username=user_data.username,
            type=VerificationType.REGISTRATION,
            method=VerificationMethod.BOTH,
            registration_data=user_data.dict()
        )
        
        success, message, verification = await verification_service.create_verification_code(verification_data)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return VerificationCodeResponse(
            message="Verification code sent to your email and WhatsApp",
            email=user_data.email,
            phone=user_data.phone,
            expires_in_minutes=10,
            can_resend_after_minutes=5
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during registration: {str(e)}"
        )

@router.post("/verify-registration", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def verify_registration(
    verification_data: VerificationCodeVerify,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Verify registration code and create user"""
    try:
        verification_service = VerificationService(db)
        user_service = UserService(db)
        
        # Verify the code
        success, message, registration_data = await verification_service.verify_code(
            verification_data.email,
            verification_data.phone,
            verification_data.code,
            verification_data.type
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        if not registration_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration data not found. Please start registration again."
            )
        
        # Create the user with verified status
        user_create = UserCreate(**registration_data)
        user = await user_service.create_user(user_create, email_verified=True, phone_verified=True)
        
        logger.info(f"User registered and verified successfully: {user.id}")
        
        # Convert to response model
        user_dict = user.dict(by_alias=True)
        return UserResponse(**user_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during verification: {str(e)}"
        )

@router.post("/resend-code", response_model=VerificationCodeResponse)
async def resend_verification_code(
    resend_data: ResendCodeRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Resend verification code"""
    try:
        verification_service = VerificationService(db)
        
        success, message = await verification_service.resend_code(
            resend_data.email,
            resend_data.phone,
            resend_data.type
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return VerificationCodeResponse(
            message="Verification code resent successfully",
            email=resend_data.email,
            phone=resend_data.phone,
            expires_in_minutes=10,
            can_resend_after_minutes=5
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend code error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification code"
        )

@router.post("/forgot-password", response_model=VerificationCodeResponse)
async def forgot_password(
    reset_data: PasswordResetRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Request password reset"""
    try:
        user_service = UserService(db)
        verification_service = VerificationService(db)
        
        # Find user by email or username
        user = None
        if "@" in reset_data.identifier:
            user = await user_service.get_user_by_email(reset_data.identifier)
        else:
            user = await user_service.get_user_by_username(reset_data.identifier)
        
        if not user:
            # Don't reveal if user exists
            raise HTTPException(
                status_code=status.HTTP_200_OK,
                detail="If the account exists, a verification code will be sent"
            )
        
        # Create verification code
        from app.schemas.verification import VerificationCodeCreate
        verification_data = VerificationCodeCreate(
            email=user.email,
            phone=user.phone,
            type=VerificationType.PASSWORD_RESET,
            method=reset_data.method
        )
        
        success, message, _ = await verification_service.create_verification_code(
            verification_data,
            str(user.id)
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return VerificationCodeResponse(
            message=f"Verification code sent via {reset_data.method.value}",
            email=user.email,
            phone=user.phone,
            expires_in_minutes=10,
            can_resend_after_minutes=5
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset request error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )

@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordResetVerify,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Reset password with verification code"""
    try:
        verification_service = VerificationService(db)
        user_service = UserService(db)
        
        # Verify the code
        success, message, _ = await verification_service.verify_code(
            reset_data.email,
            reset_data.phone,
            reset_data.code,
            VerificationType.PASSWORD_RESET
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        # Find and update user password
        user = await user_service.get_user_by_email(reset_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        from app.utils.auth import get_password_hash
        hashed_password = get_password_hash(reset_data.new_password)
        
        await db.users.update_one(
            {"_id": ObjectId(user.id)},
            {"$set": {
                "password": hashed_password,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.post("/login")
async def login(user_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Authenticate user and return access token with user data"""
    try:
        logger.info(f"Login attempt for username: {user_data.username}")
        auth_service = AuthService(db)
        user_service = UserService(db)
        
        # First check if user is verified
        user = await user_service.get_user_by_username_case_insensitive(user_data.username)
        if user and not (user.email_verified and user.phone_verified):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email and phone number before logging in"
            )
        
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
```

## KhayalHealthcare-Backend/app/routers/coupons.py

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.coupon import (
    CouponCreate, CouponResponse, CouponUpdate, CouponApply,
    CouponValidateResponse, BulkCouponCreate
)
from app.services.coupon import CouponService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
import logging

router = APIRouter(
    prefix="/coupons",
    tags=["coupons"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

# Admin endpoints

@router.post("/admin/create", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    coupon_data: CouponCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new coupon (admin only)"""
    try:
        coupon_service = CouponService(db)
        coupon = await coupon_service.create_coupon(coupon_data, str(admin_user.id))
        return coupon.dict(by_alias=True)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create coupon"
        )

@router.post("/admin/bulk-create", response_model=List[CouponResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_coupons(
    bulk_data: BulkCouponCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Generate multiple coupons with unique codes (admin only)"""
    try:
        coupon_service = CouponService(db)
        coupons = await coupon_service.generate_bulk_coupons(bulk_data, str(admin_user.id))
        return [coupon.dict(by_alias=True) for coupon in coupons]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create bulk coupons: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create bulk coupons"
        )

@router.get("/admin/all", response_model=List[CouponResponse])
async def get_all_coupons(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all coupons (admin only)"""
    coupon_service = CouponService(db)
    coupons = await coupon_service.get_all_coupons()
    return [coupon.dict(by_alias=True) for coupon in coupons]

@router.get("/admin/{coupon_id}", response_model=CouponResponse)
async def get_coupon_by_id(
    coupon_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific coupon by ID (admin only)"""
    coupon_service = CouponService(db)
    coupon = await coupon_service.get_coupon_by_id(coupon_id)
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return coupon.dict(by_alias=True)

@router.patch("/admin/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: str,
    update_data: CouponUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a coupon (admin only)"""
    coupon_service = CouponService(db)
    updated_coupon = await coupon_service.update_coupon(coupon_id, update_data)
    
    if not updated_coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return updated_coupon.dict(by_alias=True)

@router.delete("/admin/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a coupon (admin only)"""
    coupon_service = CouponService(db)
    success = await coupon_service.delete_coupon(coupon_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    

@router.get("/admin/{coupon_id}/statistics", response_model=dict)
async def get_coupon_statistics(
    coupon_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get detailed statistics for a coupon (admin only)"""
    coupon_service = CouponService(db)
    stats = await coupon_service.get_coupon_statistics(coupon_id)
    
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return stats

# User endpoints

@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    coupon_apply: CouponApply,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Validate if a coupon can be applied (for users)"""
    coupon_service = CouponService(db)
    
    is_valid, message, discount, usage_info = await coupon_service.validate_coupon(
        coupon_apply.code,
        str(current_user.id),
        coupon_apply.order_total
    )
    
    response = {
        "valid": is_valid,
        "message": message
    }
    
    if is_valid and discount is not None:
        response["discount_amount"] = discount
        response["final_amount"] = coupon_apply.order_total - discount
        if usage_info:
            response["user_usage_count"] = usage_info["user_usage_count"]
            response["user_remaining_uses"] = usage_info["user_remaining_uses"]
    
    return response

@router.post("/apply", response_model=dict)
async def apply_coupon_to_order(
    code: str,
    order_id: str,
    order_total: float,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Apply a coupon to an order (for users)"""
    coupon_service = CouponService(db)
    
    success, message, discount = await coupon_service.apply_coupon(
        code,
        str(current_user.id),
        order_id,
        order_total
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {
        "success": success,
        "message": message,
        "discount_applied": discount,
        "final_amount": order_total - discount if discount else order_total
    }

@router.get("/my-usage", response_model=List[dict])
async def get_my_coupon_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get coupon usage history for the current user"""
    coupon_service = CouponService(db)
    usage_records = await coupon_service.get_user_coupon_usage(str(current_user.id))
    
    # Get coupon details for each usage
    usage_with_details = []
    for usage in usage_records:
        usage_dict = usage.dict(by_alias=True)
        
        # Get coupon details
        coupon = await coupon_service.get_coupon_by_id(str(usage.coupon_id))
        if coupon:
            usage_dict["coupon"] = {
                "code": coupon.code,
                "type": coupon.type,
                "discount_percentage": coupon.discount_percentage,
                "discount_amount": coupon.discount_amount
            }
        
        usage_with_details.append(usage_dict)
    
    return usage_with_details
```

## KhayalHealthcare-Backend/app/routers/meals.py

```python
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
    """Get meals for the authenticated chef"""
    # Validate that current user is a chef
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
    """Get all meals from all available chefs with chef details"""
    from app.services.user import UserService
    
    meal_service = MealService(db)
    user_service = UserService(db)
    
    # Get all chefs
    chefs = await user_service.get_users_by_role(UserRole.CHEF)
    
    # Get all meals
    all_meals = []
    for chef in chefs:
        # Check if chef is approved AND available
        if chef.approval_status == "approved" and chef.available:
            meals = await meal_service.get_meals_by_chef(str(chef.id))
            for meal in meals:
                if meal.meal_visibility:  # Still check meal visibility
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
    """Create new meal (chef only)"""
    # Validate that current user is a chef
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
        # Check if chef is approved AND available
        if chef.approval_status == "approved" and chef.available:
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
                "available": chef.available,
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
```

## KhayalHealthcare-Backend/app/routers/messages.py

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.message import MessageCreate, MessageResponse
from app.services.message import MessageService
from app.config.database import get_database
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/messages",
    tags=["messages"],
    responses={401: {"description": "Unauthorized"}},
)

@router.get("/{user_id}", response_model=List[MessageResponse])
async def get_messages_for_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get messages for a specific user (sent or received)"""
    message_service = MessageService(db)
    messages = await message_service.get_messages_for_user(user_id)
    return [message.dict(by_alias=True) for message in messages]

@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new message"""
    message_service = MessageService(db)
    message = await message_service.create_message(message_data)
    return message.dict(by_alias=True)
```

## KhayalHealthcare-Backend/app/routers/orders.py

```python
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

logger = logging.getLogger(__name__)

@router.get("/chef/my-orders", response_model=List[dict])
async def get_orders_by_chef(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get orders for the currently logged-in chef"""
    try:
        # Verify that the current user is a chef
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
    try:
        # Check if the current user is a subscriber
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
    """Create new order - notifications will be sent automatically"""
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
        
        # Create order - notifications will be sent automatically in the service
        order = await order_service.create_order(order_data)

        # Get related data for response
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
    """Update order status - notifications will be sent automatically"""
    try:
        # Validate order_id is a valid ObjectId
        if not ObjectId.is_valid(order_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order ID format: {order_id}"
            )
            
        order_service = OrderService(db)
        
        # For chef users, verify they own the order
        if current_user.role == UserRole.CHEF:
            order = await order_service.get_order_by_id(order_id)
            if not order:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Order not found"
                )
            if str(order.chef_id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own orders"
                )
        
        # Update status - notifications will be sent automatically in the service
        await order_service.update_order_status(order_id, status_update.status)
        
        return {
            "message": "Order status updated successfully",
            "order_id": order_id,
            "new_status": status_update.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update order status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        )
```

## KhayalHealthcare-Backend/app/routers/subscription_plans.py

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.models.subscription_plan import PlanType
from app.schemas.subscription_plan import (
    SubscriptionPlanCreate, 
    SubscriptionPlanResponse, 
    SubscriptionPlanUpdate,
    SubscriptionPlanVisibilityUpdate
)
from app.services.subscription_plan import SubscriptionPlanService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
import logging

router = APIRouter(
    prefix="/subscription-plans",
    tags=["subscription plans"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

@router.get("", response_model=List[SubscriptionPlanResponse])
async def get_all_subscription_plans(
    include_hidden: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all subscription plans"""
    plan_service = SubscriptionPlanService(db)
    
    # Only admin can see hidden plans
    if include_hidden and current_user.role != "admin":
        include_hidden = False
    
    plans = await plan_service.get_all_plans(include_hidden)
    return [plan.dict(by_alias=True) for plan in plans]

@router.get("/type/{plan_type}", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans_by_type(
    plan_type: PlanType,
    include_hidden: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get subscription plans by type"""
    plan_service = SubscriptionPlanService(db)
    
    # Only admin can see hidden plans
    if include_hidden and current_user.role != "admin":
        include_hidden = False
    
    plans = await plan_service.get_plans_by_type(plan_type, include_hidden)
    return [plan.dict(by_alias=True) for plan in plans]

@router.get("/{plan_id}", response_model=SubscriptionPlanResponse)
async def get_subscription_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get subscription plan by ID"""
    plan_service = SubscriptionPlanService(db)
    
    # Try to get by MongoDB ID first
    plan = await plan_service.get_plan_by_id(plan_id)
    
    # If not found, try by plan_id
    if not plan:
        plan = await plan_service.get_plan_by_plan_id(plan_id)
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Non-admin users can't see hidden plans
    if not plan.visibility and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    return plan.dict(by_alias=True)

@router.post("", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_plan(
    plan_data: SubscriptionPlanCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new subscription plan (admin only)"""
    try:
        plan_service = SubscriptionPlanService(db)
        plan = await plan_service.create_subscription_plan(plan_data)
        return plan.dict(by_alias=True)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription plan"
        )

@router.put("/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_subscription_plan(
    plan_id: str,
    plan_update: SubscriptionPlanUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update subscription plan (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    updated_plan = await plan_service.update_plan(plan_id, plan_update)
    if not updated_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found or could not be updated"
        )
    
    return updated_plan.dict(by_alias=True)

@router.patch("/{plan_id}/visibility", response_model=SubscriptionPlanResponse)
async def update_plan_visibility(
    plan_id: str,
    visibility_update: SubscriptionPlanVisibilityUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update subscription plan visibility (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    updated_plan = await plan_service.update_plan_visibility(plan_id, visibility_update.visibility)
    if not updated_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found or could not be updated"
        )
    
    return updated_plan.dict(by_alias=True)

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription_plan(
    plan_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete subscription plan (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    success = await plan_service.delete_plan(plan_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found or could not be deleted"
        )
    
    return None

@router.post("/bulk", response_model=List[SubscriptionPlanResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_subscription_plans(
    plans: List[SubscriptionPlanCreate],
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create multiple subscription plans at once (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    created_plans = await plan_service.bulk_create_plans(plans)
    return [plan.dict(by_alias=True) for plan in created_plans]

# Public endpoint for getting visible plans by type (no auth required)
@router.get("/public/{plan_type}", response_model=List[SubscriptionPlanResponse])
async def get_public_subscription_plans(
    plan_type: PlanType,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get visible subscription plans by type (public endpoint)"""
    plan_service = SubscriptionPlanService(db)
    plans = await plan_service.get_plans_by_type(plan_type, include_hidden=False)
    return [plan.dict(by_alias=True) for plan in plans]
```

## KhayalHealthcare-Backend/app/routers/user.py

```python
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
    return UserResponse(**current_user.dict(by_alias=True))

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
    """Get list of subscribers assigned to the current caretaker with in_progress status"""
    # Verify the current user is a caretaker
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

```

## KhayalHealthcare-Backend/app/routers/visit_requests.py

```python
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
            assignment.appointment_date_time  # Add this parameter
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
    """Get all assignments for the current caretaker with subscriber details"""
    # Verify user is a caretaker
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
    """Update care visit request status by caretaker (accept, cancel, in_progress, completed)"""
    # Verify user is a caretaker
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
    """Get all assignments for the current psychologist with subscriber details"""
    # Verify user is a psychologist
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
    """Update psychologist visit request status by psychologist (accept, cancel, in_progress, completed)"""
    # Verify user is a psychologist
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


```

## KhayalHealthcare-Backend/app/routers/vitals.py

```python
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

@router.get("/remotePPG/{subscriber_id}", response_model=List[VitalsResponse])
async def get_remote_ppg_vitals_by_subscriber(
    subscriber_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get remotePPG vitals for a specific subscriber"""
    vitals_service = VitalsService(db)
    vitals = await vitals_service.get_remote_ppg_vitals_by_subscriber(subscriber_id)
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
```

## KhayalHealthcare-Backend/app/schemas/__init__.py

```python
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


from app.schemas.verification import (
    VerificationCodeCreate,
    VerificationCodeVerify,
    ResendCodeRequest,
    PasswordResetRequest,
    PasswordResetVerify,
    VerificationCodeResponse
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

    "VerificationCodeCreate", "VerificationCodeVerify", "ResendCodeRequest",
    "PasswordResetRequest", "PasswordResetVerify", "VerificationCodeResponse",
]
```

## KhayalHealthcare-Backend/app/schemas/advertisement.py

```python
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
```

## KhayalHealthcare-Backend/app/schemas/appointment.py

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class AppointmentCreate(BaseModel):
    subscriber_id: str
    psychologist_id: str
    appointment_date: datetime
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str = Field(alias="_id")
    subscriber_id: str
    psychologist_id: str
    appointment_date: datetime
    notes: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class AppointmentNotesUpdate(BaseModel):
    notes: str
```

## KhayalHealthcare-Backend/app/schemas/coupon.py

```python
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
```

## KhayalHealthcare-Backend/app/schemas/meal.py

```python
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
    id: str = Field(alias="_id")
    chef_id: str
    name: str
    description: str
    price: float
    ingredients: List[str]
    dietary_info: Optional[str] = None
    meal_visibility: bool
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)
```

## KhayalHealthcare-Backend/app/schemas/message.py

```python
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class MessageCreate(BaseModel):
    from_id: str
    to_id: str
    content: str

class MessageResponse(BaseModel):
    id: str = Field(alias="_id")
    from_id: str
    to_id: str
    content: str
    timestamp: datetime
    read: bool

    model_config = ConfigDict(populate_by_name=True)
```

## KhayalHealthcare-Backend/app/schemas/order.py

```python
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
    id: str = Field(alias="_id")
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
```

## KhayalHealthcare-Backend/app/schemas/subscription_plan.py

```python
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
```

## KhayalHealthcare-Backend/app/schemas/user.py

```python
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
```

## KhayalHealthcare-Backend/app/schemas/verification.py

```python
from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional
from datetime import datetime
from app.models.verification import VerificationType, VerificationMethod, VerificationStatus

class VerificationCodeCreate(BaseModel):
    email: str
    phone: str
    username: Optional[str] = None
    type: VerificationType
    method: VerificationMethod = VerificationMethod.BOTH
    registration_data: Optional[dict] = None

class VerificationCodeVerify(BaseModel):
    email: str
    phone: str
    code: str
    type: VerificationType
    
    @validator('code')
    def validate_code(cls, v):
        if not v or len(v) != 6:
            raise ValueError('Verification code must be 6 digits')
        if not v.isdigit():
            raise ValueError('Verification code must contain only digits')
        return v

class ResendCodeRequest(BaseModel):
    email: str
    phone: str
    type: VerificationType

class PasswordResetRequest(BaseModel):
    identifier: str  # Can be email or username
    method: VerificationMethod  # EMAIL or WHATSAPP

class PasswordResetVerify(BaseModel):
    email: str
    phone: str
    code: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if sum(c.isdigit() for c in v) < 2:
            raise ValueError('Password must contain at least two numbers')
        return v

class VerificationCodeResponse(BaseModel):
    message: str
    email: str
    phone: str
    expires_in_minutes: int = 10
    can_resend_after_minutes: int = 5
    
    model_config = ConfigDict(populate_by_name=True)
```

## KhayalHealthcare-Backend/app/schemas/visit_request.py

```python
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
    id: str = Field(alias="_id")
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
    id: str = Field(alias="_id")
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
```

## KhayalHealthcare-Backend/app/schemas/vitals.py

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class VitalsCreate(BaseModel):
    subscriber_id: str
    caretaker_id: Optional[str] = None
    heart_rate: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    blood_sugar: Optional[float] = None 
    report_type: str = "manual"

class VitalsResponse(BaseModel):
    id: str = Field(alias="_id")
    subscriber_id: str
    caretaker_id: Optional[str] = None
    timestamp: datetime
    heart_rate: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    blood_sugar: Optional[float] = None 
    report_type: str
    caretaker_name: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)
```

## KhayalHealthcare-Backend/app/services/__init__.py

```python
"""Business logic services"""

from app.services.appointment import AppointmentService
from app.services.auth import AuthService
from app.services.meal import MealService
from app.services.message import MessageService
from app.services.order import OrderService
from app.services.user import UserService
from app.services.visit_request import VisitRequestService
from app.services.vitals import VitalsService
from app.services.coupon import CouponService
from app.services.advertisement import AdvertisementService
from app.services.subscription_plan import SubscriptionPlanService

__all__ = [
    "AppointmentService",
    "AuthService",
    "MealService",
    "MessageService",
    "OrderService",
    "UserService",
    "VisitRequestService",
    "VitalsService",
    "CouponService",
    "AdvertisementService",
    "SubscriptionPlanService"
]
```

## KhayalHealthcare-Backend/app/services/advertisement.py

```python
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.advertisement import Advertisement, AdvertisementStatus
from app.models.user import UserRole
from app.schemas.advertisement import AdvertisementCreate, AdvertisementUpdate
from datetime import datetime
import os
import shutil
from pathlib import Path

class AdvertisementService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.advertisements
        
    async def create_advertisement(
        self, 
        ad_data: AdvertisementCreate, 
        image_path: str,
        created_by: str
    ) -> Advertisement:
        """Create new advertisement"""
        ad_dict = ad_data.dict()
        ad_dict['image_url'] = image_path
        ad_dict['created_by'] = ObjectId(created_by)
        ad_dict['created_at'] = datetime.utcnow()
        ad_dict['updated_at'] = datetime.utcnow()
        ad_dict['click_count'] = 0
        ad_dict['view_count'] = 0
        ad_dict['status'] = AdvertisementStatus.ACTIVE
        
        result = await self.collection.insert_one(ad_dict)
        
        # Convert ObjectId to string for Pydantic model
        ad_dict['_id'] = str(result.inserted_id)
        ad_dict['created_by'] = str(ad_dict['created_by'])
        
        return Advertisement(**ad_dict)
    
    async def get_all_advertisements(self) -> List[Advertisement]:
        """Get all advertisements (admin only)"""
        cursor = self.collection.find().sort("display_order", 1)
        ads = []
        async for ad_doc in cursor:
            ad_doc['_id'] = str(ad_doc['_id'])
            ad_doc['created_by'] = str(ad_doc['created_by'])
            ads.append(Advertisement(**ad_doc))
        return ads
    
    async def get_advertisements_by_role(self, role: UserRole) -> List[Advertisement]:
        """Get active advertisements for a specific role"""
        now = datetime.utcnow()
        cursor = self.collection.find({
            "target_role": role,
            "status": AdvertisementStatus.ACTIVE,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }).sort("display_order", 1)
        
        ads = []
        async for ad_doc in cursor:
            ad_doc['_id'] = str(ad_doc['_id'])
            ad_doc['created_by'] = str(ad_doc['created_by'])
            ads.append(Advertisement(**ad_doc))
        return ads
    
    async def get_advertisement_by_id(self, ad_id: str) -> Optional[Advertisement]:
        """Get advertisement by ID"""
        try:
            ad_doc = await self.collection.find_one({"_id": ObjectId(ad_id)})
            if ad_doc:
                ad_doc['_id'] = str(ad_doc['_id'])
                ad_doc['created_by'] = str(ad_doc['created_by'])
                return Advertisement(**ad_doc)
            return None
        except:
            return None
    
    async def update_advertisement(
        self, 
        ad_id: str, 
        ad_update: AdvertisementUpdate,
        image_path: Optional[str] = None
    ) -> Optional[Advertisement]:
        """Update advertisement"""
        try:
            update_dict = {k: v for k, v in ad_update.dict().items() if v is not None}
            update_dict['updated_at'] = datetime.utcnow()
            
            if image_path:
                update_dict['image_url'] = image_path
                
            result = await self.collection.update_one(
                {"_id": ObjectId(ad_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_advertisement_by_id(ad_id)
            return None
        except:
            return None
    
    async def delete_advertisement(self, ad_id: str) -> bool:
        """Delete advertisement and its image"""
        try:
            # Get ad to find image path
            ad = await self.get_advertisement_by_id(ad_id)
            if ad:
                # Delete image file if exists
                if ad.image_url and os.path.exists(ad.image_url):
                    os.remove(ad.image_url)
                    
                # Delete from database
                result = await self.collection.delete_one({"_id": ObjectId(ad_id)})
                return result.deleted_count > 0
            return False
        except:
            return False
    
    async def increment_view_count(self, ad_id: str):
        """Increment view count for an advertisement"""
        await self.collection.update_one(
            {"_id": ObjectId(ad_id)},
            {"$inc": {"view_count": 1}}
        )
    
    async def increment_click_count(self, ad_id: str):
        """Increment click count for an advertisement"""
        await self.collection.update_one(
            {"_id": ObjectId(ad_id)},
            {"$inc": {"click_count": 1}}
        )
    
    async def update_expired_advertisements(self):
        """Update status of expired advertisements"""
        now = datetime.utcnow()
        await self.collection.update_many(
            {
                "status": AdvertisementStatus.ACTIVE,
                "end_date": {"$lt": now}
            },
            {"$set": {"status": AdvertisementStatus.EXPIRED}}
        )
```

## KhayalHealthcare-Backend/app/services/appointment.py

```python
from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Appointment
from app.schemas.appointment import AppointmentCreate
from datetime import datetime

class AppointmentService:
    def __init__(self, db: AsyncIOMotorDatabase):
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
```

## KhayalHealthcare-Backend/app/services/auth.py

```python
from datetime import timedelta
from fastapi import HTTPException, status
from app.utils.auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.services.user import UserService
from app.schemas.user import UserLogin, Token
import logging

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db):
        self.db = db
        self.user_service = UserService(db)
    
    async def authenticate_user(self, username: str, password: str):
        """Authenticate user with username and password"""
        try:
            # Try to get user (case-insensitive)
            user = await self.user_service.get_user_by_username_case_insensitive(username)
            if not user:
                logger.info(f"Authentication failed - user not found: {username}")
                return False
            
            # Verify password
            if not verify_password(password, user.password):
                logger.info(f"Authentication failed - incorrect password for user: {username}")
                return False
            
            logger.info(f"Authentication successful for user: {username}")
            return user
            
        except Exception as e:
            logger.error(f"Authentication error for user {username}: {str(e)}")
            # Don't return False on errors, raise exception to differentiate from wrong credentials
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service temporarily unavailable"
            )
    
    async def login_user(self, user_data: UserLogin):
        """Login user and return access token with user data"""
        try:
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
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login service error. Please try again."
            )
```

## KhayalHealthcare-Backend/app/services/coupon.py

```python
from typing import List, Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.coupon import Coupon, CouponUsage, CouponType, CouponStatus
from app.schemas.coupon import CouponCreate, CouponUpdate, BulkCouponCreate
from datetime import datetime, timedelta
import random
import string

class CouponService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.coupons
        self.usage_collection = db.coupon_usage
    
    async def create_coupon(self, coupon_data: CouponCreate, admin_id: str) -> Coupon:
        """Create a new coupon"""
        # Check if coupon code already exists
        existing = await self.collection.find_one({"code": coupon_data.code.upper()})
        if existing:
            raise ValueError(f"Coupon with code '{coupon_data.code}' already exists")
        
        coupon_dict = coupon_data.dict()
        coupon_dict['code'] = coupon_dict['code'].upper()
        coupon_dict['created_by'] = ObjectId(admin_id)
        coupon_dict['created_at'] = datetime.utcnow()
        coupon_dict['updated_at'] = datetime.utcnow()
        coupon_dict['current_usage'] = 0
        coupon_dict['user_usage_count'] = {}
        coupon_dict['status'] = CouponStatus.ACTIVE
        
        # Set default valid_from to 1 minute in the past if not provided
        if not coupon_dict.get('valid_from'):
            coupon_dict['valid_from'] = datetime.utcnow() - timedelta(minutes=1)
        
        result = await self.collection.insert_one(coupon_dict)
        
        # Convert ObjectId to string for Pydantic model
        coupon_dict['_id'] = str(result.inserted_id)
        coupon_dict['created_by'] = str(coupon_dict['created_by'])
        
        return Coupon(**coupon_dict)
    
    async def generate_bulk_coupons(self, bulk_data: BulkCouponCreate, admin_id: str) -> List[Coupon]:
        """Generate multiple coupons with unique codes"""
        coupons = []
        
        for i in range(bulk_data.quantity):
            # Generate unique code
            unique_code = self._generate_unique_code(bulk_data.prefix)
            
            # Check if code exists
            attempts = 0
            while await self.collection.find_one({"code": unique_code}) and attempts < 10:
                unique_code = self._generate_unique_code(bulk_data.prefix)
                attempts += 1
            
            if attempts >= 10:
                raise ValueError(f"Failed to generate unique codes. Generated {len(coupons)} out of {bulk_data.quantity}")
            
            # Create coupon data
            coupon_data = CouponCreate(
                code=unique_code,
                type=bulk_data.type,
                discount_percentage=bulk_data.discount_percentage,
                discount_amount=bulk_data.discount_amount,
                usage_limit=bulk_data.usage_limit,
                per_user_limit=bulk_data.per_user_limit,
                valid_from=bulk_data.valid_from,
                valid_until=bulk_data.valid_until
            )
            
            # Create coupon
            coupon = await self.create_coupon(coupon_data, admin_id)
            coupons.append(coupon)
        
        return coupons
    
    def _generate_unique_code(self, prefix: str) -> str:
        """Generate a unique coupon code"""
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"{prefix.upper()}-{suffix}"
    
    async def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        """Get coupon by code"""
        coupon_doc = await self.collection.find_one({"code": code.upper()})
        if coupon_doc:
            # Convert ObjectId fields to strings
            coupon_doc['_id'] = str(coupon_doc['_id'])
            coupon_doc['created_by'] = str(coupon_doc['created_by'])
            # user_usage_count should already be in correct format
            return Coupon(**coupon_doc)
        return None
    
    async def get_all_coupons(self) -> List[Coupon]:
        """Get all coupons (admin only)"""
        cursor = self.collection.find()
        coupons = []
        async for coupon_doc in cursor:
            # Convert ObjectId fields to strings
            coupon_doc['_id'] = str(coupon_doc['_id'])
            coupon_doc['created_by'] = str(coupon_doc['created_by'])
            coupons.append(Coupon(**coupon_doc))
        return coupons
    
    async def update_coupon(self, coupon_id: str, update_data: CouponUpdate) -> Optional[Coupon]:
        """Update coupon"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if update_dict:
            update_dict['updated_at'] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(coupon_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_coupon_by_id(coupon_id)
        return None
    
    async def get_coupon_by_id(self, coupon_id: str) -> Optional[Coupon]:
        """Get coupon by ID"""
        try:
            coupon_doc = await self.collection.find_one({"_id": ObjectId(coupon_id)})
            if coupon_doc:
                # Convert ObjectId fields to strings
                coupon_doc['_id'] = str(coupon_doc['_id'])
                coupon_doc['created_by'] = str(coupon_doc['created_by'])
                return Coupon(**coupon_doc)
            return None
        except:
            return None
    
    async def delete_coupon(self, coupon_id: str) -> bool:
        """Delete coupon"""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(coupon_id)})
            return result.deleted_count > 0
        except:
            return False
    
    async def validate_coupon(self, code: str, user_id: str, order_total: float) -> Tuple[bool, str, Optional[float], Optional[dict]]:
        """Validate if a coupon can be used by a user"""
        coupon = await self.get_coupon_by_code(code)

        if not coupon:
            return False, "Invalid coupon code", None, None

        # Debug log to check times
        now = datetime.utcnow()

        # Check if coupon is active
        if coupon.status != CouponStatus.ACTIVE:
            return False, "Coupon is not active", None, None

        # Check validity dates
        if coupon.valid_from and now < coupon.valid_from:
            return False, "Coupon is not yet valid", None, None
        
        # Check total usage limit
        if coupon.usage_limit is not None and coupon.current_usage >= coupon.usage_limit:
            return False, "Coupon has reached its total usage limit", None, None
        
        # Check per-user usage limit
        user_usage = coupon.user_usage_count.get(user_id, 0)
        if coupon.per_user_limit is not None and user_usage >= coupon.per_user_limit:
            return False, f"You have already used this coupon {user_usage} times (limit: {coupon.per_user_limit})", None, None
        
        # Calculate discount
        if coupon.type == CouponType.PERCENTAGE:
            discount = (order_total * coupon.discount_percentage) / 100
        else:
            discount = min(coupon.discount_amount, order_total)
        
        # Calculate remaining uses for user
        remaining_uses = None
        if coupon.per_user_limit is not None:
            remaining_uses = coupon.per_user_limit - user_usage
        
        usage_info = {
            "user_usage_count": user_usage,
            "user_remaining_uses": remaining_uses
        }
        
        return True, "Coupon is valid", discount, usage_info
    
    async def apply_coupon(self, code: str, user_id: str, order_id: str, order_total: float) -> Tuple[bool, str, Optional[float]]:
        """Apply a coupon to an order"""
        # Validate coupon first
        is_valid, message, discount, usage_info = await self.validate_coupon(code, user_id, order_total)
        
        if not is_valid:
            return False, message, None
        
        coupon = await self.get_coupon_by_code(code)
        
        # Update coupon usage
        update_ops = {
            "$inc": {
                "current_usage": 1,
                f"user_usage_count.{user_id}": 1
            }
        }
        
        await self.collection.update_one(
            {"_id": ObjectId(coupon.id)},
            update_ops
        )
        
        # Record usage
        usage_record = {
            "coupon_id": ObjectId(coupon.id),
            "user_id": ObjectId(user_id),
            "order_id": ObjectId(order_id) if order_id else None,
            "used_at": datetime.utcnow(),
            "discount_applied": discount
        }
        
        await self.usage_collection.insert_one(usage_record)
        
        return True, "Coupon applied successfully", discount
    
    async def get_user_coupon_usage(self, user_id: str) -> List[CouponUsage]:
        """Get coupon usage history for a user"""
        cursor = self.usage_collection.find({"user_id": ObjectId(user_id)})
        usage_records = []
        async for usage_doc in cursor:
            # Convert ObjectId fields to strings
            usage_doc['_id'] = str(usage_doc['_id'])
            usage_doc['coupon_id'] = str(usage_doc['coupon_id'])
            usage_doc['user_id'] = str(usage_doc['user_id'])
            if usage_doc.get('order_id'):
                usage_doc['order_id'] = str(usage_doc['order_id'])
            usage_records.append(CouponUsage(**usage_doc))
        return usage_records
    
    async def get_coupon_statistics(self, coupon_id: str) -> dict:
        """Get detailed statistics for a coupon (admin only)"""
        coupon = await self.get_coupon_by_id(coupon_id)
        if not coupon:
            return None
        
        # Get total discount given
        pipeline = [
            {"$match": {"coupon_id": ObjectId(coupon_id)}},
            {"$group": {
                "_id": None,
                "total_discount": {"$sum": "$discount_applied"},
                "total_uses": {"$sum": 1}
            }}
        ]
        
        stats_cursor = self.usage_collection.aggregate(pipeline)
        stats = await stats_cursor.to_list(1)
        
        total_discount = stats[0]["total_discount"] if stats else 0
        total_uses = stats[0]["total_uses"] if stats else 0
        
        return {
            "coupon_code": coupon.code,
            "total_uses": total_uses,
            "unique_users": len(coupon.user_usage_count),
            "total_discount_given": total_discount,
            "usage_limit": coupon.usage_limit,
            "per_user_limit": coupon.per_user_limit,
            "remaining_uses": (coupon.usage_limit - coupon.current_usage) if coupon.usage_limit else None,
            "user_usage_breakdown": coupon.user_usage_count
        }
```

## KhayalHealthcare-Backend/app/services/meal.py

```python
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.meal import Meal
from app.schemas.meal import MealCreate
from datetime import datetime


class MealService:
    def __init__(self, db: AsyncIOMotorDatabase):
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

```

## KhayalHealthcare-Backend/app/services/message.py

```python
from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Message
from app.schemas.message import MessageCreate
from datetime import datetime

class MessageService:
    def __init__(self, db: AsyncIOMotorDatabase):
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
```

## KhayalHealthcare-Backend/app/services/notification.py

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from whatsapp_api_client_python import API
import re

# Gmail SMTP configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "khayalhealth2@gmail.com"
EMAIL_PASSWORD = "wdde hxca nwah zzvy"    

def send_notification(to_email, subject, body):
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add body to email
        msg.attach(MIMEText(body, 'plain'))
        
        # Create SMTP session
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()  # Enable security
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_ADDRESS, to_email, text)
        server.quit()
        
        print("Email sent successfully!")
        
    except Exception as e:
        print(f"Error: {e}")



def send_message(number, message):
    greenAPI = API.GreenAPI("7105273045", "4b9a2e248a1a446bb36a8daf97f71a300c3660e2d7e0457486")
    
    # Format Pakistani phone number
    formatted_number = format_pakistani_number(number)
    
    response = greenAPI.sending.sendMessage(f"{formatted_number}@c.us", message)
    return response.data

def format_pakistani_number(number):
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', number)
    
    # Handle different Pakistani number formats
    if digits_only.startswith('92'):
        # Already has country code
        return digits_only
    elif digits_only.startswith('03'):
        # Local format (03xxxxxxxxx) - remove leading 0 and add 92
        return '92' + digits_only[1:]
    elif len(digits_only) == 10 and digits_only.startswith('3'):
        # Format without leading 0 (3xxxxxxxxx) - add 92
        return '92' + digits_only
    else:
        # If it doesn't match expected patterns, assume it needs 92 prefix
        return '92' + digits_only.lstrip('0')
```

## KhayalHealthcare-Backend/app/services/order.py

```python
from typing import List, Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Order, OrderStatus, UserRole
from app.schemas.order import OrderCreate
from datetime import datetime
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class OrderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.orders
        self.users = db.users
        self.meals = db.meals

    async def create_order(self, order_data: OrderCreate) -> Order:
        """Create new order and notify chef and admins"""
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

        order = Order(**order_dict)

        # Send notifications asynchronously
        asyncio.create_task(self._notify_new_order(order))

        return order

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
        """Update order status and notify relevant parties"""
        # Get order details before updating
        order_doc = await self.collection.find_one({"_id": ObjectId(order_id)})
        if not order_doc:
            raise ValueError(f"Order not found: {order_id}")

        # Update the status
        await self.collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )

        # Convert to Order object for notifications
        order_doc['_id'] = str(order_doc['_id'])
        order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
        order_doc['chef_id'] = str(order_doc['chef_id'])
        order_doc['meal_id'] = str(order_doc['meal_id'])
        order_doc['status'] = status  # Use the new status
        order = Order(**order_doc)

        # Send notifications asynchronously
        asyncio.create_task(self._notify_order_status_change(order, status))

    async def get_order_by_id(self, order_id: str) -> Optional[Order]:
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

    # Notification Methods
    async def _notify_new_order(self, order: Order):
        """Notify chef and admins about new order"""
        try:
            # Get chef, subscriber, and meal details
            chef = await self.users.find_one({"_id": ObjectId(order.chef_id)})
            subscriber = await self.users.find_one({"_id": ObjectId(order.subscriber_id)})
            meal = await self.meals.find_one({"_id": ObjectId(order.meal_id)})

            if not chef or not subscriber or not meal:
                logger.error("Missing user or meal data for order notifications")
                return

            # Get all admins
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)

            order_time = order.timestamp.strftime("%B %d, %Y at %I:%M %p")
            
            notification_tasks = []

            # Notify Chef
            chef_subject = "New Order Received - Khayal Healthcare"
            chef_email_body = f"""
Dear {chef.get('name', 'Chef')},

You have received a new order!

Order Details:
- Order ID: {order.id}
- Customer: {subscriber.get('name', 'Unknown')}
- Phone: {subscriber.get('phone', 'Unknown')}
- Meal: {meal.get('name', 'Unknown')}
- Quantity: {order.quantity}
- Total Price: Rs. {order.total_price}
- Delivery Address: {order.delivery_address}
- Order Time: {order_time}

Please log in to your dashboard to confirm this order.

Best regards,
Khayal Healthcare
"""

            chef_whatsapp = f"""🔔 *New Order Received!*

*Order ID:* {order.id}
*Customer:* {subscriber.get('name', 'Unknown')}
*Phone:* {subscriber.get('phone', 'Unknown')}

*Meal:* {meal.get('name', 'Unknown')}
*Quantity:* {order.quantity}
*Total:* Rs. {order.total_price}

*Delivery Address:*
{order.delivery_address}

Please confirm this order in your dashboard.

- Khayal Healthcare"""

            # Add chef notification tasks
            if chef.get('email'):
                notification_tasks.append(
                    self._send_email_notification(chef['email'], chef_subject, chef_email_body, f"chef {chef['email']}")
                )
            if chef.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(chef['phone'], chef_whatsapp, f"chef {chef['phone']}")
                )

            # Notify Admins
            admin_subject = "New Food Order Placed - Khayal Healthcare"
            admin_email_body = f"""
Dear Admin,

A new food order has been placed:

Order Details:
- Order ID: {order.id}
- Customer: {subscriber.get('name', 'Unknown')} ({subscriber.get('phone', 'Unknown')})
- Chef: {chef.get('name', 'Unknown')}
- Meal: {meal.get('name', 'Unknown')}
- Total Price: Rs. {order.total_price}
- Order Time: {order_time}

Please monitor the order progress.

Best regards,
Khayal Healthcare System
"""

            admin_whatsapp = f"""🔔 *New Food Order*

*Order ID:* {order.id}
*Customer:* {subscriber.get('name', 'Unknown')}
*Chef:* {chef.get('name', 'Unknown')}
*Meal:* {meal.get('name', 'Unknown')}
*Total:* Rs. {order.total_price}

Monitor order progress in admin panel.

- Khayal Healthcare"""

            # Add admin notification tasks
            for admin in admins:
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], admin_subject, admin_email_body, f"admin {admin['email']}")
                    )
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], admin_whatsapp, f"admin {admin['phone']}")
                    )

            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in new order notifications: {str(e)}")

    async def _notify_order_status_change(self, order: Order, new_status: OrderStatus):
        """Notify relevant parties about order status changes"""
        try:
            # Get chef, subscriber, and meal details
            chef = await self.users.find_one({"_id": ObjectId(order.chef_id)})
            subscriber = await self.users.find_one({"_id": ObjectId(order.subscriber_id)})
            meal = await self.meals.find_one({"_id": ObjectId(order.meal_id)})

            if not chef or not subscriber or not meal:
                logger.error("Missing user or meal data for status change notifications")
                return

            notification_tasks = []

            # Define status messages
            status_messages = {
                OrderStatus.CONFIRMED: "Your order has been confirmed by the chef and is being prepared.",
                OrderStatus.PREPARING: "Your order is now being prepared by the chef.",
                OrderStatus.READY: "Your order is ready and will be delivered soon.",
                OrderStatus.DELIVERED: "Your order has been delivered. Enjoy your meal!",
                OrderStatus.CANCELLED: "Your order has been cancelled."
            }

            message = status_messages.get(new_status, f"Your order status has been updated to: {new_status}")

            # Notify Subscriber for all status changes
            sub_subject = f"Order Status Update - {new_status.value.title()}"
            sub_email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

{message}

Order Details:
- Order ID: {order.id}
- Meal: {meal.get('name', 'Unknown')}
- Chef: {chef.get('name', 'Unknown')}
- Total Price: Rs. {order.total_price}

Thank you for choosing Khayal Healthcare.

Best regards,
Khayal Healthcare
"""

            sub_whatsapp = f"""🔔 *Order Update*

{message}

*Order ID:* {order.id}
*Meal:* {meal.get('name', 'Unknown')}
*Chef:* {chef.get('name', 'Unknown')}

Thank you for your order!

- Khayal Healthcare"""

            # Add subscriber notification tasks
            if subscriber.get('email'):
                notification_tasks.append(
                    self._send_email_notification(subscriber['email'], sub_subject, sub_email_body, f"subscriber {subscriber['email']}")
                )
            if subscriber.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(subscriber['phone'], sub_whatsapp, f"subscriber {subscriber['phone']}")
                )

            # Notify Admins only for DELIVERED status
            if new_status == OrderStatus.DELIVERED:
                # Get all admins
                admin_cursor = self.users.find({"role": UserRole.ADMIN})
                admins = await admin_cursor.to_list(None)

                admin_subject = "Order Completed - Khayal Healthcare"
                admin_email_body = f"""
Dear Admin,

An order has been successfully delivered:

Order Details:
- Order ID: {order.id}
- Customer: {subscriber.get('name', 'Unknown')} ({subscriber.get('phone', 'Unknown')})
- Chef: {chef.get('name', 'Unknown')}
- Meal: {meal.get('name', 'Unknown')}
- Total Price: Rs. {order.total_price}
- Status: DELIVERED

The order cycle has been completed successfully.

Best regards,
Khayal Healthcare System
"""

                admin_whatsapp = f"""✅ *Order Completed*

*Order ID:* {order.id}
*Customer:* {subscriber.get('name', 'Unknown')}
*Chef:* {chef.get('name', 'Unknown')}
*Total:* Rs. {order.total_price}

Order delivered successfully!

- Khayal Healthcare"""

                # Add admin notification tasks
                for admin in admins:
                    if admin.get('email'):
                        notification_tasks.append(
                            self._send_email_notification(admin['email'], admin_subject, admin_email_body, f"admin {admin['email']}")
                        )
                    if admin.get('phone'):
                        notification_tasks.append(
                            self._send_whatsapp_notification(admin['phone'], admin_whatsapp, f"admin {admin['phone']}")
                        )

            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in order status change notifications: {str(e)}")

    async def _send_email_notification(self, email: str, subject: str, body: str, recipient_type: str):
        """Send email notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_notification, email, subject, body
            )
            logger.info(f"Email notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_type}: {str(e)}")

    async def _send_whatsapp_notification(self, phone: str, message: str, recipient_type: str):
        """Send WhatsApp notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_message, phone, message
            )
            logger.info(f"WhatsApp notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {recipient_type}: {str(e)}")
```

## KhayalHealthcare-Backend/app/services/subscription_plan.py

```python
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.subscription_plan import SubscriptionPlan, PlanType
from app.schemas.subscription_plan import SubscriptionPlanCreate, SubscriptionPlanUpdate
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SubscriptionPlanService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.subscription_plans
    
    async def create_subscription_plan(self, plan_data: SubscriptionPlanCreate) -> SubscriptionPlan:
        """Create a new subscription plan"""
        # Check if plan_id already exists
        existing_plan = await self.collection.find_one({"plan_id": plan_data.plan_id})
        if existing_plan:
            raise ValueError(f"Subscription plan with ID '{plan_data.plan_id}' already exists")
        
        plan_dict = plan_data.dict()
        plan_dict['created_at'] = datetime.utcnow()
        plan_dict['updated_at'] = datetime.utcnow()
        
        # Convert nested models to dicts
        plan_dict['numeric'] = plan_data.numeric.dict()
        plan_dict['billing'] = plan_data.billing.dict()
        
        result = await self.collection.insert_one(plan_dict)
        plan_dict['_id'] = str(result.inserted_id)
        
        return SubscriptionPlan(**plan_dict)
    
    async def get_all_plans(self, include_hidden: bool = False) -> List[SubscriptionPlan]:
        """Get all subscription plans"""
        query = {} if include_hidden else {"visibility": True}
        cursor = self.collection.find(query)
        plans = []
        async for plan_doc in cursor:
            plan_doc['_id'] = str(plan_doc['_id'])
            plans.append(SubscriptionPlan(**plan_doc))
        return plans
    
    async def get_plans_by_type(self, plan_type: PlanType, include_hidden: bool = False) -> List[SubscriptionPlan]:
        """Get subscription plans by type"""
        query = {"type": plan_type}
        if not include_hidden:
            query["visibility"] = True
        
        cursor = self.collection.find(query)
        plans = []
        async for plan_doc in cursor:
            plan_doc['_id'] = str(plan_doc['_id'])
            plans.append(SubscriptionPlan(**plan_doc))
        return plans
    
    async def get_plan_by_id(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan by MongoDB ID"""
        try:
            plan_doc = await self.collection.find_one({"_id": ObjectId(plan_id)})
            if plan_doc:
                plan_doc['_id'] = str(plan_doc['_id'])
                return SubscriptionPlan(**plan_doc)
            return None
        except Exception as e:
            logger.error(f"Error fetching plan by ID: {str(e)}")
            return None
    
    async def get_plan_by_plan_id(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan by plan_id (e.g., 'food-basic')"""
        plan_doc = await self.collection.find_one({"plan_id": plan_id})
        if plan_doc:
            plan_doc['_id'] = str(plan_doc['_id'])
            return SubscriptionPlan(**plan_doc)
        return None
    
    async def update_plan(self, plan_id: str, plan_update: SubscriptionPlanUpdate) -> Optional[SubscriptionPlan]:
        """Update subscription plan"""
        try:
            update_dict = {}
            
            # Only include non-None values
            for field, value in plan_update.dict(exclude_unset=True).items():
                if value is not None:
                    if field == 'numeric':
                        update_dict['numeric'] = value
                    elif field == 'billing':
                        update_dict['billing'] = value
                    else:
                        update_dict[field] = value
            
            if update_dict:
                update_dict['updated_at'] = datetime.utcnow()
                
                result = await self.collection.update_one(
                    {"_id": ObjectId(plan_id)},
                    {"$set": update_dict}
                )
                
                if result.modified_count > 0:
                    return await self.get_plan_by_id(plan_id)
            
            return None
        except Exception as e:
            logger.error(f"Error updating plan: {str(e)}")
            return None
    
    async def update_plan_visibility(self, plan_id: str, visibility: bool) -> Optional[SubscriptionPlan]:
        """Update plan visibility"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(plan_id)},
                {"$set": {"visibility": visibility, "updated_at": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                return await self.get_plan_by_id(plan_id)
            return None
        except Exception as e:
            logger.error(f"Error updating plan visibility: {str(e)}")
            return None
    
    async def delete_plan(self, plan_id: str) -> bool:
        """Delete subscription plan"""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(plan_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting plan: {str(e)}")
            return False
    
    async def bulk_create_plans(self, plans: List[SubscriptionPlanCreate]) -> List[SubscriptionPlan]:
        """Create multiple subscription plans at once"""
        created_plans = []
        for plan_data in plans:
            try:
                plan = await self.create_subscription_plan(plan_data)
                created_plans.append(plan)
            except ValueError as e:
                logger.warning(f"Skipping plan {plan_data.plan_id}: {str(e)}")
                continue
        return created_plans
```

## KhayalHealthcare-Backend/app/services/user.py

```python
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus, SubscriptionStatus
from app.schemas.user import UserCreate, UserUpdate
from app.utils.auth import get_password_hash
from datetime import datetime
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users

    async def create_user(self, user_data: UserCreate, email_verified: bool = False, phone_verified: bool = False) -> User:
        """Create a new user and notify admins"""
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
        
        # Add verification status
        user_dict['email_verified'] = email_verified
        user_dict['phone_verified'] = phone_verified
        if email_verified and phone_verified:
            user_dict['verified_at'] = datetime.utcnow()
    
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
        
        # Create User object
        new_user = User(**user_dict)
        
        # Only notify if verified
        if email_verified and phone_verified:
            # Notify admins about new registration
            asyncio.create_task(self._notify_admins_new_registration(new_user))
            
            # Notify user about profile submission
            asyncio.create_task(self._notify_user_profile_submitted(new_user))
    
        return new_user

    
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
        """Update user approval status and notify user if approved"""
        # Get user details before updating
        user = await self.get_user_by_id(user_id)
        if not user:
            logger.error(f"User not found for approval update: {user_id}")
            return
            
        # Update status
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"approval_status": status, "updated_at": datetime.utcnow()}}
        )
        
        # Notify user if approved or rejected
        if status in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]:
            asyncio.create_task(self._notify_user_approval_status(user, status))

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
        plans: List[str],
        expiry_date: datetime,
        renewal_date: Optional[datetime] = None
    ):
        """Update user subscription"""
        update_data = {
            "subscription_status": status,
            "subscription_plans": plans,
            "subscription_expiry": expiry_date,
            "updated_at": datetime.utcnow()
        }

        update_data["subscription_renewal_date"] = renewal_date or expiry_date

        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

    async def get_user_by_username_case_insensitive(self, username: str) -> Optional[User]:
        """Get user by username (case-insensitive)"""
        try:
            # Create case-insensitive regex pattern
            user_doc = await self.collection.find_one({
                "username": {"$regex": f"^{username}$", "$options": "i"}
            })
            if user_doc:
                user_doc['_id'] = str(user_doc['_id'])
                return User(**user_doc)
            return None
        except Exception as e:
            raise

    # Notification methods
    async def _notify_admins_new_registration(self, new_user: User):
        """Notify all admins about new user registration"""
        try:
            # Get all admin users
            admin_cursor = self.collection.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)
            
            if not admins:
                logger.warning("No admin users found to notify")
                return
            
            # Email notification content
            subject = f"New {new_user.role.value.title()} Registration - Khayal Healthcare"
            email_body = f"""
Dear Admin,

A new {new_user.role.value} has registered on Khayal Healthcare:

User Details:
- Name: {new_user.name}
- Username: {new_user.username}
- Email: {new_user.email}
- Phone: {new_user.phone}
- Role: {new_user.role.value}
"""
            
            # Add role-specific details
            if new_user.role == UserRole.SUBSCRIBER:
                email_body += f"""
- Age: {new_user.age or 'Not provided'}
- City: {new_user.city}
- Previous Illness: {new_user.previous_illness or 'None'}
"""
            elif new_user.role in [UserRole.CHEF, UserRole.CARETAKER, UserRole.PSYCHOLOGIST]:
                email_body += f"""
- Experience: {new_user.experience or 'Not provided'} years
- Degree/Certification: {new_user.degree or 'Not provided'}
"""
                
            email_body += """

Please log in to the admin portal to review and approve/reject this registration.

Best regards,
Khayal Healthcare System
"""
            
            # WhatsApp message content
            whatsapp_message = f"""🔔 *New {new_user.role.value.title()} Registration*

*Name:* {new_user.name}
*Username:* {new_user.username}
*Email:* {new_user.email}
*Phone:* {new_user.phone}
*Role:* {new_user.role.value}

Please review and approve/reject through the admin portal.

- Khayal Healthcare"""
            
            # Create notification tasks for all admins
            notification_tasks = []
            
            for admin in admins:
                # Email notification task
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(
                            admin['email'], 
                            subject, 
                            email_body, 
                            f"admin {admin.get('name', admin['email'])}"
                        )
                    )
                
                # WhatsApp notification task
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(
                            admin['phone'], 
                            whatsapp_message, 
                            f"admin {admin.get('name', admin['phone'])}"
                        )
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in admin registration notifications: {str(e)}")

    async def _notify_user_profile_submitted(self, user: User):
        """Notify user that their profile has been submitted for review"""
        try:
            # Email content
            subject = "Registration Submitted - Khayal Healthcare"
            email_body = f"""
Dear {user.name},

Thank you for registering with Khayal Healthcare!

Your profile has been successfully submitted and is currently under review by our admin team. We will notify you once your account has been approved.

Your Registration Details:
- Username: {user.username}
- Email: {user.email}
- Role: {user.role.value.title()}

This review process typically takes 24-48 hours. You will receive a notification via email and WhatsApp once your account status is updated.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
Khayal Healthcare Team
"""
            
            # WhatsApp message
            whatsapp_message = f"""👋 Welcome to Khayal Healthcare!

Dear {user.name},

Your registration has been submitted successfully! ✅

*Status:* Under Review 🔍
*Username:* {user.username}
*Role:* {user.role.value.title()}

We'll notify you once your account is approved (usually within 24-48 hours).

Thank you for choosing Khayal Healthcare!

- Khayal Healthcare Team"""
            
            notification_tasks = []
            
            # Send email notification
            if user.email:
                notification_tasks.append(
                    self._send_email_notification(
                        user.email, 
                        subject, 
                        email_body, 
                        f"user {user.name}"
                    )
                )
            
            # Send WhatsApp notification
            if user.phone:
                notification_tasks.append(
                    self._send_whatsapp_notification(
                        user.phone, 
                        whatsapp_message, 
                        f"user {user.name}"
                    )
                )
            
            # Execute notifications
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                
        except Exception as e:
            logger.error(f"Error notifying user about profile submission: {str(e)}")

    async def _notify_user_approval_status(self, user: User, status: ApprovalStatus):
        """Notify user about their approval status"""
        try:
            if status == ApprovalStatus.APPROVED:
                # Approval email
                subject = "Account Approved - Welcome to Khayal Healthcare!"
                email_body = f"""
Dear {user.name},

Great news! Your account has been approved! 🎉

You can now log in to Khayal Healthcare using your credentials:
- Username: {user.username}
- Role: {user.role.value.title()}

What's next?
- Log in to your dashboard
- Complete your profile if needed
- Start using our services

If you have any questions or need assistance, our support team is here to help.

Welcome to the Khayal Healthcare family!

Best regards,
Khayal Healthcare Team
"""
                
                # Approval WhatsApp
                whatsapp_message = f"""🎉 *Congratulations {user.name}!*

Your Khayal Healthcare account has been *APPROVED!* ✅

*Username:* {user.username}
*Role:* {user.role.value.title()}

You can now log in and start using our services.

Welcome to Khayal Healthcare! 🏥

- Khayal Healthcare Team"""
                
            else:  # REJECTED
                # Rejection email
                subject = "Account Review Update - Khayal Healthcare"
                email_body = f"""
Dear {user.name},

Thank you for your interest in Khayal Healthcare.

After reviewing your application, we regret to inform you that we are unable to approve your account at this time.

If you believe this decision was made in error or would like to provide additional information, please contact our support team at support@khayalhealthcare.com.

We appreciate your understanding.

Best regards,
Khayal Healthcare Team
"""
                
                # Rejection WhatsApp
                whatsapp_message = f"""Dear {user.name},

Your Khayal Healthcare account application status: *Not Approved* ❌

For more information or to appeal this decision, please contact our support team.

Thank you for your understanding.

- Khayal Healthcare Team"""
            
            notification_tasks = []
            
            # Send email notification
            if user.email:
                notification_tasks.append(
                    self._send_email_notification(
                        user.email, 
                        subject, 
                        email_body, 
                        f"user {user.name}"
                    )
                )
            
            # Send WhatsApp notification
            if user.phone:
                notification_tasks.append(
                    self._send_whatsapp_notification(
                        user.phone, 
                        whatsapp_message, 
                        f"user {user.name}"
                    )
                )
            
            # Execute notifications
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                
        except Exception as e:
            logger.error(f"Error notifying user about approval status: {str(e)}")

    # Helper methods for notifications
    async def _send_email_notification(self, email: str, subject: str, body: str, recipient_type: str):
        """Send email notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_notification, email, subject, body
            )
            logger.info(f"Email notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_type}: {str(e)}")

    async def _send_whatsapp_notification(self, phone: str, message: str, recipient_type: str):
        """Send WhatsApp notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_message, phone, message
            )
            logger.info(f"WhatsApp notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {recipient_type}: {str(e)}")
```

## KhayalHealthcare-Backend/app/services/verification.py

```python
import random
import string
from typing import Optional, Tuple
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.verification import (
    VerificationCode, VerificationType, VerificationMethod, 
    VerificationStatus, AccountRestriction
)
from app.models.user import User
from app.schemas.verification import VerificationCodeCreate
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class VerificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.verifications = db.verification_codes
        self.restrictions = db.account_restrictions
        self.users = db.users
        
        # Configuration
        self.CODE_LENGTH = 6
        self.CODE_EXPIRY_MINUTES = 10
        self.RESEND_COOLDOWN_MINUTES = 5
        self.MAX_RESEND_ATTEMPTS = 3
        self.RESTRICTION_DAYS = 4
    
    def generate_code(self) -> str:
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=self.CODE_LENGTH))
    
    async def check_restrictions(self, email: str, phone: str) -> Tuple[bool, Optional[str]]:
        """Check if the email/phone is restricted"""
        now = datetime.utcnow()
        
        # Check for active restrictions
        restriction = await self.restrictions.find_one({
            "$or": [{"email": email}, {"phone": phone}],
            "restricted_until": {"$gt": now}
        })
        
        if restriction:
            restricted_until = restriction['restricted_until']
            days_left = (restricted_until - now).days
            return False, f"Account restricted for {days_left} more days due to excessive attempts"
        
        return True, None
    
    async def create_verification_code(
        self, 
        data: VerificationCodeCreate,
        user_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[VerificationCode]]:
        """Create and send verification code"""
        try:
            # Check restrictions
            is_allowed, restriction_msg = await self.check_restrictions(data.email, data.phone)
            if not is_allowed:
                return False, restriction_msg, None
            
            # Check for existing pending verification
            existing = await self.verifications.find_one({
                "email": data.email,
                "phone": data.phone,
                "type": data.type,
                "status": VerificationStatus.PENDING,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            if existing:
                # Check if can resend
                last_sent = existing.get('last_sent_at', existing.get('created_at'))
                time_since_last = datetime.utcnow() - last_sent
                
                if time_since_last < timedelta(minutes=self.RESEND_COOLDOWN_MINUTES):
                    minutes_left = self.RESEND_COOLDOWN_MINUTES - int(time_since_last.total_seconds() / 60)
                    return False, f"Please wait {minutes_left} minutes before requesting a new code", None
                
                # Check resend attempts
                if existing.get('resend_count', 0) >= self.MAX_RESEND_ATTEMPTS:
                    # Create restriction
                    await self._create_restriction(data.email, data.phone, "Exceeded maximum verification attempts")
                    return False, f"Maximum attempts exceeded. Account restricted for {self.RESTRICTION_DAYS} days", None
            
            # Generate new code
            code = self.generate_code()
            expires_at = datetime.utcnow() + timedelta(minutes=self.CODE_EXPIRY_MINUTES)
            
            # Create verification record
            verification_dict = {
                "email": data.email,
                "phone": data.phone,
                "username": data.username,
                "code": code,
                "type": data.type,
                "method": data.method,
                "status": VerificationStatus.PENDING,
                "attempts": 0,
                "last_sent_at": datetime.utcnow(),
                "expires_at": expires_at,
                "created_at": datetime.utcnow(),
                "resend_count": existing.get('resend_count', 0) + 1 if existing else 0,
                "last_resend_at": datetime.utcnow() if existing else None,
                "registration_data": data.registration_data
            }
            
            if user_id:
                verification_dict["user_id"] = ObjectId(user_id)
            
            # Update or insert
            if existing:
                await self.verifications.update_one(
                    {"_id": existing['_id']},
                    {"$set": verification_dict}
                )
                verification_dict['_id'] = existing['_id']
            else:
                result = await self.verifications.insert_one(verification_dict)
                verification_dict['_id'] = result.inserted_id
            
            # Send verification code
            await self._send_verification_code(data.email, data.phone, code, data.type, data.method)
            
            # Convert to model
            verification_dict['_id'] = str(verification_dict['_id'])
            if verification_dict.get('user_id'):
                verification_dict['user_id'] = str(verification_dict['user_id'])
            
            return True, "Verification code sent successfully", VerificationCode(**verification_dict)
            
        except Exception as e:
            logger.error(f"Error creating verification code: {str(e)}")
            return False, "Failed to send verification code", None
    
    async def verify_code(
        self, 
        email: str, 
        phone: str, 
        code: str, 
        type: VerificationType
    ) -> Tuple[bool, str, Optional[dict]]:
        """Verify the code"""
        try:
            # Find the verification record
            verification = await self.verifications.find_one({
                "email": email,
                "phone": phone,
                "type": type,
                "status": VerificationStatus.PENDING
            })
            
            if not verification:
                return False, "No pending verification found", None
            
            # Check expiry
            if datetime.utcnow() > verification['expires_at']:
                await self.verifications.update_one(
                    {"_id": verification['_id']},
                    {"$set": {"status": VerificationStatus.EXPIRED}}
                )
                return False, "Verification code has expired", None
            
            # Increment attempts
            attempts = verification.get('attempts', 0) + 1
            await self.verifications.update_one(
                {"_id": verification['_id']},
                {"$inc": {"attempts": 1}}
            )
            
            # Check code
            if verification['code'] != code:
                if attempts >= 5:
                    await self._create_restriction(email, phone, "Too many incorrect verification attempts")
                    return False, "Too many incorrect attempts. Account restricted", None
                return False, f"Invalid code. {5 - attempts} attempts remaining", None
            
            # Mark as verified
            await self.verifications.update_one(
                {"_id": verification['_id']},
                {"$set": {
                    "status": VerificationStatus.VERIFIED,
                    "verified_at": datetime.utcnow()
                }}
            )
            
            # Return registration data if available
            return True, "Code verified successfully", verification.get('registration_data')
            
        except Exception as e:
            logger.error(f"Error verifying code: {str(e)}")
            return False, "Verification failed", None
    
    async def resend_code(self, email: str, phone: str, type: VerificationType) -> Tuple[bool, str]:
        """Resend verification code"""
        data = VerificationCodeCreate(
            email=email,
            phone=phone,
            type=type,
            method=VerificationMethod.BOTH
        )
        
        success, message, _ = await self.create_verification_code(data)
        return success, message
    
    async def _create_restriction(self, email: str, phone: str, reason: str):
        """Create account restriction"""
        restriction = {
            "email": email,
            "phone": phone,
            "restriction_type": "excessive_attempts",
            "restricted_until": datetime.utcnow() + timedelta(days=self.RESTRICTION_DAYS),
            "reason": reason,
            "created_at": datetime.utcnow()
        }
        
        await self.restrictions.insert_one(restriction)
    
    async def _send_verification_code(
        self, 
        email: str, 
        phone: str, 
        code: str, 
        type: VerificationType,
        method: VerificationMethod
    ):
        """Send verification code via email and/or WhatsApp"""
        tasks = []
        
        if type == VerificationType.REGISTRATION:
            subject = "Verify Your Khayal Healthcare Account"
            email_body = f"""
Dear User,

Welcome to Khayal Healthcare! To complete your registration, please use the following verification code:

Verification Code: {code}

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

If you didn't request this code, please ignore this email.

Best regards,
Khayal Healthcare Team
"""
            
            whatsapp_message = f"""🔐 *Khayal Healthcare Verification*

Your verification code is: *{code}*

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

Don't share this code with anyone.

- Khayal Healthcare"""
            
        else:  # Password Reset
            subject = "Reset Your Khayal Healthcare Password"
            email_body = f"""
Dear User,

You requested to reset your password. Use this verification code:

Verification Code: {code}

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Khayal Healthcare Team
"""
            
            whatsapp_message = f"""🔐 *Password Reset Request*

Your verification code is: *{code}*

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

If you didn't request this, please ignore this message.

- Khayal Healthcare"""
        
        # Send based on method
        if method in [VerificationMethod.EMAIL, VerificationMethod.BOTH]:
            tasks.append(
                self._send_email_async(email, subject, email_body)
            )
        
        if method in [VerificationMethod.WHATSAPP, VerificationMethod.BOTH]:
            tasks.append(
                self._send_whatsapp_async(phone, whatsapp_message)
            )
        
        # Execute all tasks
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_email_async(self, email: str, subject: str, body: str):
        """Send email asynchronously"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_notification, email, subject, body
            )
            logger.info(f"Verification email sent to {email}")
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {str(e)}")
    
    async def _send_whatsapp_async(self, phone: str, message: str):
        """Send WhatsApp message asynchronously"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_message, phone, message
            )
            logger.info(f"Verification WhatsApp sent to {phone}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {phone}: {str(e)}")
    
    async def cleanup_expired_codes(self):
        """Clean up expired verification codes"""
        await self.verifications.delete_many({
            "status": VerificationStatus.PENDING,
            "expires_at": {"$lt": datetime.utcnow()}
        })
```

## KhayalHealthcare-Backend/app/services/visit_request.py

```python
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import CareVisitRequest, PsychologistVisitRequest, CareVisitRequestStatus, UserRole
from app.schemas.visit_request import CareVisitRequestCreate, PsychologistVisitRequestCreate
from datetime import datetime
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class VisitRequestService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.care_visits = db.care_visit_requests
        self.psych_visits = db.psychologist_visit_requests
        self.users = db.users

    # Care Visit Requests
    async def create_care_visit_request(self, request_data: CareVisitRequestCreate) -> CareVisitRequest:
        """Create new care visit request and notify admins"""
        request_dict = request_data.dict()
        request_dict['subscriber_id'] = ObjectId(request_data.subscriber_id)
        request_dict['status'] = CareVisitRequestStatus.PENDING
        request_dict['created_at'] = datetime.utcnow()
    
        result = await self.care_visits.insert_one(request_dict)
        
        # Convert ObjectId to string for Pydantic model
        request_dict['_id'] = str(result.inserted_id)
        request_dict['subscriber_id'] = str(request_dict['subscriber_id'])
        
        # Get subscriber details
        subscriber = await self.users.find_one({"_id": ObjectId(request_data.subscriber_id)})
        
        # Notify all admins - Don't wait for this to complete
        asyncio.create_task(self._notify_admins_new_care_request(subscriber, request_dict['_id']))
    
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
        except Exception as e:
            logger.error(f"Error getting care visit request {request_id}: {str(e)}")
            return None

    async def assign_caretaker(self, request_id: str, caretaker_id: str, appointment_datetime: datetime):
        """Assign caretaker to visit request with appointment time"""
        # Validate ObjectIds first
        if not ObjectId.is_valid(request_id):
            raise ValueError(f"Invalid request ID: {request_id}")
        
        if not ObjectId.is_valid(caretaker_id):
            raise ValueError(f"Invalid caretaker ID: {caretaker_id}")
        
        # Get request details before updating
        request = await self.care_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise ValueError(f"Request not found: {request_id}")
        
        # Update the request
        await self.care_visits.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "caretaker_id": ObjectId(caretaker_id),
                    "appointment_date_time": appointment_datetime,
                    "status": CareVisitRequestStatus.ASSIGNED
                }
            }
        )

        # Get subscriber and caretaker details
        subscriber = await self.users.find_one({"_id": request['subscriber_id']})
        caretaker = await self.users.find_one({"_id": ObjectId(caretaker_id)})
        
        # Send notifications - Don't wait for this to complete
        asyncio.create_task(self._notify_caretaker_assignment(subscriber, caretaker, appointment_datetime))

    async def update_care_visit_status(self, request_id: str, status: CareVisitRequestStatus):
        """Update care visit request status and notify if needed"""
        # Get request details
        request = await self.care_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            return

        # Update status
        await self.care_visits.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": status}}
        )

        # Send notifications for important status changes
        if status in [
            CareVisitRequestStatus.ACCEPTED, 
            CareVisitRequestStatus.IN_PROGRESS, 
            CareVisitRequestStatus.COMPLETED, 
            CareVisitRequestStatus.CANCELLED
        ]:
            asyncio.create_task(self._notify_care_status_change(request, status))

    # Psychologist Visit Requests
    async def create_psychologist_visit_request(self, request_data: PsychologistVisitRequestCreate) -> PsychologistVisitRequest:
        """Create new psychologist visit request and notify admins"""
        request_dict = request_data.dict()
        request_dict['subscriber_id'] = ObjectId(request_data.subscriber_id)
        request_dict['status'] = CareVisitRequestStatus.PENDING
        request_dict['created_at'] = datetime.utcnow()

        result = await self.psych_visits.insert_one(request_dict)

        # Convert ObjectId to string for Pydantic model
        request_dict['_id'] = str(result.inserted_id)
        request_dict['subscriber_id'] = str(request_dict['subscriber_id'])

        # Get subscriber details
        subscriber = await self.users.find_one({"_id": ObjectId(request_data.subscriber_id)})
        
        # Notify all admins - Don't wait for this to complete
        asyncio.create_task(self._notify_admins_new_psych_request(subscriber, request_dict['_id']))

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
        except Exception as e:
            logger.error(f"Error getting psychologist visit request {request_id}: {str(e)}")
            return None

    async def assign_psychologist(self, request_id: str, psychologist_id: str, appointment_datetime: datetime):
        """Assign psychologist to visit request and notify parties"""
        # Validate ObjectIds first
        if not ObjectId.is_valid(request_id):
            raise ValueError(f"Invalid request ID: {request_id}")
        
        if not ObjectId.is_valid(psychologist_id):
            raise ValueError(f"Invalid psychologist ID: {psychologist_id}")
        
        # Get request details before updating
        request = await self.psych_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise ValueError(f"Request not found: {request_id}")
        
        # Update the request
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
        
        # Get subscriber and psychologist details
        subscriber = await self.users.find_one({"_id": request['subscriber_id']})
        psychologist = await self.users.find_one({"_id": ObjectId(psychologist_id)})
        
        # Send notifications - Don't wait for this to complete
        asyncio.create_task(self._notify_psych_assignment(subscriber, psychologist, appointment_datetime))

    async def update_psychologist_visit_status(self, request_id: str, status: CareVisitRequestStatus):
        """Update psychologist visit request status and notify if needed"""
        # Get request details
        request = await self.psych_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            return

        # Update status
        await self.psych_visits.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": status}}
        )

        # Send notifications for important status changes, including IN_PROGRESS
        if status in [
            CareVisitRequestStatus.ACCEPTED, 
            CareVisitRequestStatus.IN_PROGRESS, 
            CareVisitRequestStatus.COMPLETED, 
            CareVisitRequestStatus.CANCELLED
        ]:
            asyncio.create_task(self._notify_psych_status_change(request, status))

    # Notification Methods for Care Visit Requests
    async def _notify_admins_new_care_request(self, subscriber: dict, request_id: str):
        """Notify all admins about new care visit request"""
        try:
            # Get all admin users
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)
            
            if not admins:
                logger.warning("No admin users found to notify")
                return
            
            subscriber_name = subscriber.get('name', 'Unknown') if subscriber else 'Unknown'
            subscriber_phone = subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'
            
            # Email notification content
            subject = "New Care Visit Request - Khayal Healthcare"
            email_body = f"""
Dear Admin,

A new care visit request has been submitted:

Subscriber Details:
- Name: {subscriber_name}
- Phone: {subscriber_phone}
- Request ID: {request_id}

Please log in to the admin portal to review and assign a caretaker.

Best regards,
Khayal Healthcare System
"""
            
            # WhatsApp message content
            whatsapp_message = f"""🔔 *New Care Visit Request*

*Subscriber:* {subscriber_name}
*Phone:* {subscriber_phone}
*Request ID:* {request_id}

Please assign a caretaker through the admin portal.

- Khayal Healthcare"""
            
            # Create notification tasks for all admins
            notification_tasks = []
            
            for admin in admins:
                # Email notification task
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], subject, email_body, f"admin {admin['email']}")
                    )
                
                # WhatsApp notification task
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], whatsapp_message, f"admin {admin['phone']}")
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in admin care request notifications: {str(e)}")

    async def _notify_care_status_change(self, request: dict, new_status: CareVisitRequestStatus):
        """Notify relevant parties about care visit status changes"""
        try:
            # Get subscriber details
            subscriber = await self.users.find_one({"_id": request['subscriber_id']})
            if not subscriber:
                logger.warning(f"Subscriber not found for request {request['_id']}")
                return

            # Get all admins
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)

            # Get caretaker details if assigned
            caretaker = None
            if request.get('caretaker_id'):
                caretaker = await self.users.find_one({"_id": request['caretaker_id']})

            # Define messages per status
            status_messages = {
                CareVisitRequestStatus.ACCEPTED: "Your care visit has been accepted by the caretaker.",
                CareVisitRequestStatus.IN_PROGRESS: "Your care visit session has started.",
                CareVisitRequestStatus.COMPLETED: "Your care visit session has been completed.",
                CareVisitRequestStatus.CANCELLED: "Your care visit appointment has been cancelled."
            }

            message = status_messages.get(new_status, f"Your care visit status: {new_status}")

            # Email content for subscriber
            email_subject = "Care Visit Status Update - Khayal Healthcare"
            email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

{message}

For any queries, please contact support.

Best regards,
Khayal Healthcare
"""

            # WhatsApp content for subscriber
            whatsapp_msg = f"""🔔 *Care Visit Update*

{message}

For any queries, please contact support.

- Khayal Healthcare"""

            # Email content for admins
            admin_subject = f"Care Visit Status Changed - Request {request['_id']}"
            admin_body = f"""
Dear Admin,

The care visit with Request ID {request['_id']} has changed status to: {new_status}.

Subscriber: {subscriber.get('name', 'Unknown')}
Caretaker: {caretaker.get('name', 'Not Assigned') if caretaker else 'Not Assigned'}
            
Please review if any action is needed.

Best regards,
Khayal Healthcare System
"""

            admin_whatsapp_msg = f"""🔔 *Care Visit Status Changed*

Request ID: {request['_id']}
Subscriber: {subscriber.get('name', 'Unknown')}
Caretaker: {caretaker.get('name', 'Not Assigned') if caretaker else 'Not Assigned'}
New Status: {new_status}

Please review accordingly.

- Khayal Healthcare"""

            notification_tasks = []

            # Notify subscriber
            if subscriber.get('email'):
                notification_tasks.append(
                    self._send_email_notification(subscriber['email'], email_subject, email_body, f"subscriber {subscriber['email']}")
                )
            if subscriber.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(subscriber['phone'], whatsapp_msg, f"subscriber {subscriber['phone']}")
                )

            # Notify admins
            for admin in admins:
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], admin_subject, admin_body, f"admin {admin['email']}")
                    )
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], admin_whatsapp_msg, f"admin {admin['phone']}")
                    )

            # Notify caretaker if status is relevant to them
            if caretaker and new_status in [CareVisitRequestStatus.IN_PROGRESS, CareVisitRequestStatus.COMPLETED]:
                caretaker_subject = f"Care Visit Status Update - {new_status}"
                caretaker_body = f"""
Dear {caretaker.get('name', 'Caretaker')},

The care visit for {subscriber.get('name', 'Unknown')} has been marked as: {new_status}.

Thank you for your service.

Best regards,
Khayal Healthcare
"""
                caretaker_whatsapp = f"""🔔 *Care Visit Update*

Patient: {subscriber.get('name', 'Unknown')}
Status: {new_status}

Thank you for your service.

- Khayal Healthcare"""

                if caretaker.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(caretaker['email'], caretaker_subject, caretaker_body, f"caretaker {caretaker['email']}")
                    )
                if caretaker.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(caretaker['phone'], caretaker_whatsapp, f"caretaker {caretaker['phone']}")
                    )

            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in care status change notification: {str(e)}")

    # Notification Methods for Psychology Requests
    async def _notify_admins_new_psych_request(self, subscriber: dict, request_id: str):
        """Notify all admins about new psychology visit request"""
        try:
            # Get all admin users
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)
            
            if not admins:
                logger.warning("No admin users found to notify")
                return
            
            subscriber_name = subscriber.get('name', 'Unknown') if subscriber else 'Unknown'
            subscriber_phone = subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'
            
            # Email notification content
            subject = "New Psychology Visit Request - Khayal Healthcare"
            email_body = f"""
Dear Admin,

A new psychology visit request has been submitted:

Subscriber Details:
- Name: {subscriber_name}
- Phone: {subscriber_phone}
- Request ID: {request_id}

Please log in to the admin portal to review and assign a psychologist.

Best regards,
Khayal Healthcare System
"""
            
            # WhatsApp message content
            whatsapp_message = f"""🔔 *New Psychology Visit Request*

*Subscriber:* {subscriber_name}
*Phone:* {subscriber_phone}
*Request ID:* {request_id}

Please assign a psychologist through the admin portal.

- Khayal Healthcare"""
            
            # Create notification tasks for all admins
            notification_tasks = []
            
            for admin in admins:
                # Email notification task
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], subject, email_body, f"admin {admin['email']}")
                    )
                
                # WhatsApp notification task
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], whatsapp_message, f"admin {admin['phone']}")
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in admin notifications: {str(e)}")

    async def _notify_psych_assignment(self, subscriber: dict, psychologist: dict, appointment_datetime: datetime):
        """Notify psychologist and subscriber about assignment"""
        try:
            formatted_date = appointment_datetime.strftime("%B %d, %Y at %I:%M %p")
            
            notification_tasks = []
            
            # Notify Psychologist
            if psychologist:
                psych_subject = "New Patient Assignment - Khayal Healthcare"
                psych_email_body = f"""
Dear Dr. {psychologist.get('name', 'Doctor')},

You have been assigned a new patient:

Patient Details:
- Name: {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
- Phone: {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
- Appointment: {formatted_date}

Please prepare for the session and contact the patient if needed.

Best regards,
Khayal Healthcare
"""
                
                psych_whatsapp = f"""🔔 *New Patient Assignment*

*Patient:* {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
*Phone:* {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
*Appointment:* {formatted_date}

Please prepare for the session.

- Khayal Healthcare"""
                
                # Add psychologist notification tasks
                if psychologist.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(psychologist['email'], psych_subject, psych_email_body, f"psychologist {psychologist['email']}")
                    )
                
                if psychologist.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(psychologist['phone'], psych_whatsapp, f"psychologist {psychologist['phone']}")
                    )
            
            # Notify Subscriber
            if subscriber:
                sub_subject = "Psychology Appointment Confirmed - Khayal Healthcare"
                sub_email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

Your psychology appointment has been confirmed:

Psychologist: Dr. {psychologist.get('name', 'Unknown') if psychologist else 'Unknown'}
Date & Time: {formatted_date}

The psychologist will contact you shortly. Please be available at the scheduled time.

Best regards,
Khayal Healthcare
"""
                
                sub_whatsapp = f"""✔️ *Appointment Confirmed*

*Psychologist:* Dr. {psychologist.get('name', 'Unknown') if psychologist else 'Unknown'}
*Date & Time:* {formatted_date}

Please be available at the scheduled time.

- Khayal Healthcare"""
                
                # Add subscriber notification tasks
                if subscriber.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(subscriber['email'], sub_subject, sub_email_body, f"subscriber {subscriber['email']}")
                    )
                
                if subscriber.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(subscriber['phone'], sub_whatsapp, f"subscriber {subscriber['phone']}")
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in assignment notifications: {str(e)}")

    async def _notify_caretaker_assignment(self, subscriber: dict, caretaker: dict, appointment_datetime: datetime):
        """Notify caretaker and subscriber about assignment"""
        try:
            formatted_date = appointment_datetime.strftime("%B %d, %Y at %I:%M %p")
            
            notification_tasks = []
            
            # Notify Caretaker
            if caretaker:
                caretaker_subject = "New Patient Assignment - Khayal Healthcare"
                caretaker_email_body = f"""
Dear {caretaker.get('name', 'Caretaker')},

You have been assigned a new patient:

Patient Details:
- Name: {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
- Phone: {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
- Address: {subscriber.get('address', 'Not provided') if subscriber else 'Not provided'}
- City: {subscriber.get('city', 'Not provided') if subscriber else 'Not provided'}
- Appointment: {formatted_date}

Please prepare for the visit and contact the patient if needed.

Best regards,
Khayal Healthcare
"""
                
                caretaker_whatsapp = f"""🔔 *New Patient Assignment*

*Patient:* {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
*Phone:* {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
*Address:* {subscriber.get('address', 'Not provided') if subscriber else 'Not provided'}
*Appointment:* {formatted_date}

Please prepare for the visit.

- Khayal Healthcare"""
                
                # Add caretaker notification tasks
                if caretaker.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(caretaker['email'], caretaker_subject, caretaker_email_body, f"caretaker {caretaker['email']}")
                    )
                
                if caretaker.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(caretaker['phone'], caretaker_whatsapp, f"caretaker {caretaker['phone']}")
                    )
            
            # Notify Subscriber
            if subscriber:
                sub_subject = "Care Visit Appointment Confirmed - Khayal Healthcare"
                sub_email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

Your care visit appointment has been confirmed:

Caretaker: {caretaker.get('name', 'Unknown') if caretaker else 'Unknown'}
Date & Time: {formatted_date}

The caretaker will contact you shortly. Please be available at the scheduled time.

Best regards,
Khayal Healthcare
"""
                
                sub_whatsapp = f"""✔️ *Care Visit Confirmed*

*Caretaker:* {caretaker.get('name', 'Unknown') if caretaker else 'Unknown'}
*Date & Time:* {formatted_date}

Please be available at the scheduled time.

- Khayal Healthcare"""
                
                # Add subscriber notification tasks
                if subscriber.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(subscriber['email'], sub_subject, sub_email_body, f"subscriber {subscriber['email']}")
                    )
                
                if subscriber.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(subscriber['phone'], sub_whatsapp, f"subscriber {subscriber['phone']}")
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in caretaker assignment notifications: {str(e)}")

    async def _notify_psych_status_change(self, request: dict, new_status: CareVisitRequestStatus):
        """Notify relevant parties about psychology status changes"""
        try:
            # Get subscriber details
            subscriber = await self.users.find_one({"_id": request['subscriber_id']})
            if not subscriber:
                logger.warning(f"Subscriber not found for request {request['_id']}")
                return

            # Get all admins
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)

            # Get psychologist details if assigned
            psychologist = None
            if request.get('psychologist_id'):
                psychologist = await self.users.find_one({"_id": request['psychologist_id']})

            # Define messages per status
            status_messages = {
                CareVisitRequestStatus.ACCEPTED: "Your appointment has been accepted by the psychologist.",
                CareVisitRequestStatus.IN_PROGRESS: "Your psychology session has started.",
                CareVisitRequestStatus.COMPLETED: "Your psychology session has been completed.",
                CareVisitRequestStatus.CANCELLED: "Your psychology appointment has been cancelled."
            }

            message = status_messages.get(new_status, f"Your appointment status: {new_status}")

            # Email content for subscriber
            email_subject = "Appointment Status Update - Khayal Healthcare"
            email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

{message}

For any queries, please contact support.

Best regards,
Khayal Healthcare
"""

            # WhatsApp content for subscriber
            whatsapp_msg = f"""🔔 *Appointment Update*

{message}

For any queries, please contact support.

- Khayal Healthcare"""

            # Email content for admins
            admin_subject = f"Psychology Appointment Status Changed - Request {request['_id']}"
            admin_body = f"""
Dear Admin,

The psychology appointment with Request ID {request['_id']} has changed status to: {new_status}.

Subscriber: {subscriber.get('name', 'Unknown')}
Psychologist: {psychologist.get('name', 'Not Assigned') if psychologist else 'Not Assigned'}
            
Please review if any action is needed.

Best regards,
Khayal Healthcare System
"""

            admin_whatsapp_msg = f"""🔔 *Appointment Status Changed*

Request ID: {request['_id']}
Subscriber: {subscriber.get('name', 'Unknown')}
Psychologist: {psychologist.get('name', 'Not Assigned') if psychologist else 'Not Assigned'}
New Status: {new_status}

Please review accordingly.

- Khayal Healthcare"""

            notification_tasks = []

            # Notify subscriber
            if subscriber.get('email'):
                notification_tasks.append(
                    self._send_email_notification(subscriber['email'], email_subject, email_body, f"subscriber {subscriber['email']}")
                )
            if subscriber.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(subscriber['phone'], whatsapp_msg, f"subscriber {subscriber['phone']}")
                )

            # Notify admins
            for admin in admins:
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], admin_subject, admin_body, f"admin {admin['email']}")
                    )
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], admin_whatsapp_msg, f"admin {admin['phone']}")
                    )

            # Notify psychologist if status is relevant to them
            if psychologist and new_status in [CareVisitRequestStatus.IN_PROGRESS, CareVisitRequestStatus.COMPLETED]:
                psych_subject = f"Session Status Update - {new_status}"
                psych_body = f"""
Dear Dr. {psychologist.get('name', 'Doctor')},

The session for {subscriber.get('name', 'Unknown')} has been marked as: {new_status}.

Thank you for your service.

Best regards,
Khayal Healthcare
"""
                psych_whatsapp = f"""🔔 *Session Update*

Patient: {subscriber.get('name', 'Unknown')}
Status: {new_status}

Thank you for your service.

- Khayal Healthcare"""

                if psychologist.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(psychologist['email'], psych_subject, psych_body, f"psychologist {psychologist['email']}")
                    )
                if psychologist.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(psychologist['phone'], psych_whatsapp, f"psychologist {psychologist['phone']}")
                    )

            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in psychology status change notification: {str(e)}")

    async def _send_email_notification(self, email: str, subject: str, body: str, recipient_type: str):
        """Send email notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_notification, email, subject, body
            )
            logger.info(f"Email notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_type}: {str(e)}")

    async def _send_whatsapp_notification(self, phone: str, message: str, recipient_type: str):
        """Send WhatsApp notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_message, phone, message
            )
            logger.info(f"WhatsApp notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {recipient_type}: {str(e)}")
```

## KhayalHealthcare-Backend/app/services/vitals.py

```python
from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Vitals
from app.schemas.vitals import VitalsCreate
from datetime import datetime

class VitalsService:
    def __init__(self, db: AsyncIOMotorDatabase):
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
            "report_type": {"$in": ["self", "remote-ppg", "remotePPG"]}
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
    
    async def get_remote_ppg_vitals_by_subscriber(self, subscriber_id: str) -> List[Vitals]:
        """Get remotePPG vitals for a subscriber"""
        cursor = self.collection.find({
            "subscriber_id": ObjectId(subscriber_id),
            "report_type": "remotePPG"
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
```

## KhayalHealthcare-Backend/app/utils/__init__.py

```python
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

from app.utils.initial_setup import create_default_admins

__all__ = [
    # Auth utilities
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "verify_token",

    # Dependencies
    "get_current_user",
    "get_admin_user",
    "security",
    
    # Setup utilities
    "create_default_admins",

    # Constants (use with caution)
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES"
]
```

## KhayalHealthcare-Backend/app/utils/auth.py

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from decouple import config
import logging

SECRET_KEY = config('SECRET_KEY')
ALGORITHM = config('ALGORITHM')
ACCESS_TOKEN_EXPIRE_MINUTES = int(config('ACCESS_TOKEN_EXPIRE_MINUTES'))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        # BCrypt hashes start with $2a$, $2b$, or $2y$
        if hashed_password.startswith(('$2a$', '$2b$', '$2y$')):
            return pwd_context.verify(plain_password, hashed_password)
        else:
            # Legacy plain text password support
            logger.warning("Plain text password detected - consider updating to hashed password")
            return plain_password == hashed_password
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False

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
    except JWTError as e:
        logger.error(f"Token verification error: {str(e)}")
        return None
```

## KhayalHealthcare-Backend/app/utils/cleanup.py

```python
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

async def cleanup_expired_verifications(db: AsyncIOMotorDatabase):
    """Clean up expired verification codes periodically"""
    while True:
        try:
            # Delete expired verification codes
            result = await db.verification_codes.delete_many({
                "status": "pending",
                "expires_at": {"$lt": datetime.utcnow()}
            })
            
            if result.deleted_count > 0:
                logger.info(f"Cleaned up {result.deleted_count} expired verification codes")
            
            # Wait for 1 hour before next cleanup
            await asyncio.sleep(3600)
            
        except Exception as e:
            logger.error(f"Error in cleanup task: {str(e)}")
            await asyncio.sleep(3600)
```

## KhayalHealthcare-Backend/app/utils/dependencies.py

```python
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
```

## KhayalHealthcare-Backend/app/utils/initial_setup.py

```python
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus
from app.utils.auth import get_password_hash
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def create_default_admins(db: AsyncIOMotorDatabase):
    """Create default admin users if no admin exists"""
    try:
        # Check if any admin exists
        existing_admin = await db.users.find_one({"role": UserRole.ADMIN})
        
        if existing_admin:
            logger.info("Admin users already exist, skipping default admin creation")
            return
        
        logger.info("No admin users found, creating default admins...")
        
        # Default admin data
        default_admins = [
            {
                "username": "admin1",
                "email": "admin1@khayalhealth.com",
                "name": "Admin One",
                "phone": "0300000001"
            },
            {
                "username": "admin2", 
                "email": "admin2@khayalhealth.com",
                "name": "Admin Two",
                "phone": "0300000002"
            },
            {
                "username": "admin3",
                "email": "admin3@khayalhealth.com", 
                "name": "Admin Three",
                "phone": "0300000003"
            }
        ]
        
        # Hash the default password
        hashed_password = get_password_hash("admin123")
        
        # Create admin users
        for admin_data in default_admins:
            admin_user = {
                "username": admin_data["username"],
                "email": admin_data["email"],
                "password": hashed_password,
                "name": admin_data["name"],
                "phone": admin_data["phone"],
                "role": UserRole.ADMIN,
                "approval_status": ApprovalStatus.APPROVED,
                "email_verified": True,
                "phone_verified": True,
                "verified_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "available": True
            }
            
            await db.users.insert_one(admin_user)
            logger.info(f"Created default admin user: {admin_data['username']}")
        
        logger.info("Default admin users created successfully")
        logger.warning("IMPORTANT: Please change the default admin passwords immediately!")
        
    except Exception as e:
        logger.error(f"Error creating default admin users: {str(e)}")
        raise
```

## KhayalHealthcare-Backend/documentation.py

```python
import os
import sys
from pathlib import Path
from typing import List, Set

class DocumentationGenerator:
    def __init__(self, project_root: str, output_file: str = "documentation.md"):
        self.project_root = Path(project_root)
        self.output_file = output_file
        
        # Directories and file patterns to exclude
        self.exclude_dirs = {
            '__pycache__', '.git', '.venv', 'venv', 'env', 
            '.env', 'node_modules', '.pytest_cache', '.mypy_cache',
            'htmlcov', '.coverage', 'dist', 'build', '*.egg-info'
        }
        
        self.exclude_files = {
            '.pyc', '.pyo', '.pyd', '.so', '.dll', '.dylib',
            '.DS_Store', 'Thumbs.db', '.gitignore', '.dockerignore'
        }
        
        # File extensions to include in documentation
        self.include_extensions = {'.py'}
        
    def should_exclude_dir(self, dir_path: Path) -> bool:
        """Check if directory should be excluded"""
        dir_name = dir_path.name
        return (
            dir_name in self.exclude_dirs or
            dir_name.startswith('.') or
            dir_name.endswith('.egg-info')
        )
    
    def should_exclude_file(self, file_path: Path) -> bool:
        """Check if file should be excluded"""
        file_name = file_path.name
        
        # Check if it's a file we want to document
        if file_path.suffix not in self.include_extensions:
            return True
            
        # Check against exclude patterns
        for pattern in self.exclude_files:
            if pattern.startswith('*'):
                if file_name.endswith(pattern[1:]):
                    return True
            elif pattern.startswith('.'):
                if file_path.suffix == pattern or file_name == pattern:
                    return True
            elif file_name == pattern:
                return True
                
        return False
    
    def get_relative_path(self, file_path: Path) -> str:
        """Get relative path from project root"""
        try:
            return str(file_path.relative_to(self.project_root))
        except ValueError:
            return str(file_path)
    
    def read_file_content(self, file_path: Path) -> str:
        """Read file content with proper encoding handling"""
        encodings = ['utf-8', 'latin-1', 'cp1252']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
            except Exception as e:
                return f"# Error reading file: {str(e)}"
        
        return "# Could not read file with any supported encoding"
    
    def generate_file_documentation(self, file_path: Path) -> str:
        """Generate markdown documentation for a single file"""
        relative_path = self.get_relative_path(file_path)
        
        # Convert Windows path separators to forward slashes for consistency
        relative_path = relative_path.replace('\\', '/')
        
        content = self.read_file_content(file_path)
        
        # Create markdown section
        doc = f"\n## {relative_path}\n\n"
        doc += "```python\n"
        doc += content
        if not content.endswith('\n'):
            doc += '\n'
        doc += "```\n"
        
        return doc
    
    def walk_directory(self, start_path: Path) -> List[Path]:
        """Recursively walk directory and collect Python files"""
        python_files = []
        
        for root, dirs, files in os.walk(start_path):
            root_path = Path(root)
            
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(root_path / d)]
            
            # Process files
            for file in files:
                file_path = root_path / file
                if not self.should_exclude_file(file_path):
                    python_files.append(file_path)
        
        # Sort files for consistent output
        python_files.sort()
        return python_files
    
    def generate_table_of_contents(self, files: List[Path]) -> str:
        """Generate a table of contents"""
        toc = "## Table of Contents\n\n"
        
        # Group files by directory
        file_structure = {}
        for file_path in files:
            relative_path = self.get_relative_path(file_path)
            parts = relative_path.replace('\\', '/').split('/')
            
            current = file_structure
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
            
            # Add file to structure
            if '__files__' not in current:
                current['__files__'] = []
            current['__files__'].append(parts[-1])
        
        # Generate TOC recursively
        def generate_toc_level(structure, level=0):
            result = ""
            indent = "  " * level
            
            # First, list directories
            for key in sorted(structure.keys()):
                if key != '__files__':
                    result += f"{indent}- **{key}/**\n"
                    result += generate_toc_level(structure[key], level + 1)
            
            # Then, list files
            if '__files__' in structure:
                for file in sorted(structure['__files__']):
                    file_link = file.replace('.py', '').replace('_', '-')
                    result += f"{indent}- [{file}](#{file_link})\n"
            
            return result
        
        toc += generate_toc_level(file_structure)
        return toc
    
    def generate_documentation(self):
        """Generate complete documentation"""
        print(f"Generating documentation for: {self.project_root}")
        
        # Collect all Python files
        python_files = self.walk_directory(self.project_root)
        
        if not python_files:
            print("No Python files found!")
            return
        
        print(f"Found {len(python_files)} Python files")
        
        # Start documentation
        doc_content = "# Khayal Healthcare Backend Documentation\n\n"
        doc_content += f"Generated from: `{self.project_root}`\n\n"
        doc_content += "---\n\n"
        
        # Add table of contents
        doc_content += self.generate_table_of_contents(python_files)
        doc_content += "\n---\n"
        
        # Add file documentation
        for file_path in python_files:
            print(f"Processing: {self.get_relative_path(file_path)}")
            doc_content += self.generate_file_documentation(file_path)
        
        # Write to output file
        output_path = Path(self.output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(doc_content)
        
        print(f"\nDocumentation generated successfully: {output_path}")
        print(f"Total size: {len(doc_content):,} characters")

def main():
    # Get project root from command line or use current directory
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.getcwd()
    
    # Get output file from command line or use default
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        output_file = "khayal_healthcare_documentation.md"
    
    # Generate documentation
    generator = DocumentationGenerator(project_root, output_file)
    generator.generate_documentation()

if __name__ == "__main__":
    main()
```
