from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Message
from app.schemas.message import MessageCreate
from datetime import datetime

class MessageService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.messages

    async def create_message(self, message_data: MessageCreate) -> Message:
        """Create new message"""
        message_dict = message_data.dict()
        message_dict['from_id'] = ObjectId(message_data.from_id)
        message_dict['to_id'] = ObjectId(message_data.to_id)
        message_dict['timestamp'] = datetime.utcnow()
        message_dict['read'] = False

        result = await self.collection.insert_one(message_dict)
        message_dict['_id'] = result.inserted_id
        
        return Message(**message_dict)

    async def get_messages_for_user(self, user_id: str) -> List[Message]:
        """Get all messages for a user (sent or received)"""
        user_oid = ObjectId(user_id)
        cursor = self.collection.find({
            "$or": [{"from_id": user_oid}, {"to_id": user_oid}]
        }).sort("timestamp", 1)
        
        messages = []
        async for message_doc in cursor:
            messages.append(Message(**message_doc))
        return messages
