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
