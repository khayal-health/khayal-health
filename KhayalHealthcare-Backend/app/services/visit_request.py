from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import CareVisitRequest, PsychologistVisitRequest, CareVisitRequestStatus
from app.schemas.visit_request import CareVisitRequestCreate, PsychologistVisitRequestCreate
from datetime import datetime

class VisitRequestService:
    def __init__(self, db: AsyncIOMotorDatabase):
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

