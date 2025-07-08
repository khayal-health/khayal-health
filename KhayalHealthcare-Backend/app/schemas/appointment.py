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