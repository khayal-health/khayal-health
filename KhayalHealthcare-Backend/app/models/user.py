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