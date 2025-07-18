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
    can_resend_after_minutes: int = 2  # Reduced from 5 to 2
    daily_limit: int = 5  # New field
    
    model_config = ConfigDict(populate_by_name=True)
