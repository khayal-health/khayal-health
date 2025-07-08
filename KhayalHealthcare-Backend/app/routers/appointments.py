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
