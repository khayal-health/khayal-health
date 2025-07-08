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