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
