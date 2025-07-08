from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus, SubscriptionStatus
from app.schemas.user import UserCreate, UserUpdate
from app.utils.auth import get_password_hash
from datetime import datetime

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if username already exists
        existing_user = await self.get_user_by_username(user_data.username)
        if existing_user:
            raise ValueError(f"Username '{user_data.username}' is already taken")
        
        # Check if email already exists
        existing_email = await self.get_user_by_email(user_data.email)
        if existing_email:
            raise ValueError(f"Email '{user_data.email}' is already registered")

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Create user document
        user_dict = user_data.dict()
        user_dict['password'] = hashed_password
        user_dict['approval_status'] = ApprovalStatus.PENDING
        user_dict['created_at'] = datetime.utcnow()
        user_dict['updated_at'] = datetime.utcnow()

        # Add default values for subscribers
        if user_data.role == UserRole.SUBSCRIBER:
            if not user_dict.get('address'):
                user_dict['address'] = "Default Address"
            if not user_dict.get('city'):
                user_dict['city'] = "Default City"

        # Pad phone number if needed
        if len(user_dict['phone']) < 10:
            user_dict['phone'] = user_dict['phone'].ljust(10, '0')

        result = await self.collection.insert_one(user_dict)

        # Convert ObjectId to string for Pydantic model
        user_dict['_id'] = str(result.inserted_id)

        return User(**user_dict)
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        user_doc = await self.collection.find_one({"email": email})
        if user_doc:
            user_doc['_id'] = str(user_doc['_id'])
            return User(**user_doc)
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user_doc = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user_doc:
                user_doc['_id'] = str(user_doc['_id'])
                return User(**user_doc)
            return None
        except:
            return None

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        user_doc = await self.collection.find_one({"username": username})
        if user_doc:
            user_doc['_id'] = str(user_doc['_id'])
            return User(**user_doc)
        return None

    async def get_users_by_role(self, role: str) -> List[User]:
        """Get all users by role"""
        cursor = self.collection.find({"role": role})
        users = []
        async for user_doc in cursor:
            user_doc['_id'] = str(user_doc['_id']) 
            users.append(User(**user_doc))
        return users

    async def update_user_approval_status(self, user_id: str, status: ApprovalStatus):
        """Update user approval status"""
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"approval_status": status, "updated_at": datetime.utcnow()}}
        )

    async def get_subscribers_summary(self) -> List[dict]:
        """Get subscribers with basic info"""
        cursor = self.collection.find(
            {"role": UserRole.SUBSCRIBER},
            {"_id": 1, "name": 1}
        )
        subscribers = []
        async for user_doc in cursor:
            subscribers.append({
                "id": str(user_doc["_id"]),
                "name": user_doc["name"]
            })
        return subscribers
    
    async def update_chef_availability(self, user_id: str, available: bool) -> Optional[User]:
        """Update chef availability"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id), "role": UserRole.CHEF},
                {
                    "$set": {
                        "available": available,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                return await self.get_user_by_id(user_id)
            return None
        except Exception as e:
            return None
        
    async def update_user_subscription(
        self,
        user_id: str,
        status: SubscriptionStatus,
        plans: List[str],
        expiry_date: datetime,
        renewal_date: Optional[datetime] = None
    ):
        """Update user subscription"""
        update_data = {
            "subscription_status": status,
            "subscription_plans": plans,
            "subscription_expiry": expiry_date,
            "updated_at": datetime.utcnow()
        }

        update_data["subscription_renewal_date"] = renewal_date or expiry_date

        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )


    async def get_user_by_username_case_insensitive(self, username: str) -> Optional[User]:
        """Get user by username (case-insensitive)"""
        try:
            # Create case-insensitive regex pattern
            user_doc = await self.collection.find_one({
                "username": {"$regex": f"^{username}$", "$options": "i"}
            })
            if user_doc:
                user_doc['_id'] = str(user_doc['_id'])
                return User(**user_doc)
            return None
        except Exception as e:
            raise

