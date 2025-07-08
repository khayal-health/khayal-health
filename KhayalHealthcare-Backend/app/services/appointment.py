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
