from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
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

class DailyVerificationAttempt(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: str
    phone: str
    type: VerificationType
    attempt_date: date = Field(default_factory=date.today)
    attempt_count: int = 1
    last_attempt_at: datetime = Field(default_factory=datetime.utcnow)
    
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
