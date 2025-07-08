from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.meal import Meal
from app.schemas.meal import MealCreate
from datetime import datetime


class MealService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.meals

    async def create_meal(self, meal_data: MealCreate, chef_id: str) -> Meal:
        """Create new meal"""
        meal_dict = meal_data.dict()
        meal_dict['chef_id'] = ObjectId(chef_id)  # Store as ObjectId in DB
        meal_dict['created_at'] = datetime.utcnow()

        result = await self.collection.insert_one(meal_dict)

        # Convert ObjectId to string for Pydantic model
        meal_dict['_id'] = str(result.inserted_id)
        meal_dict['chef_id'] = str(meal_dict['chef_id'])

        return Meal(**meal_dict)

    async def get_meals_by_chef(self, chef_id: str) -> List[Meal]:
        """Get all meals for a chef"""
        cursor = self.collection.find({"chef_id": ObjectId(chef_id)})
        meals = []
        async for meal_doc in cursor:
            # Convert ObjectId fields to strings
            meal_doc['_id'] = str(meal_doc['_id'])
            meal_doc['chef_id'] = str(meal_doc['chef_id'])
            meals.append(Meal(**meal_doc))
        return meals

    async def get_meal_by_id(self, meal_id: str) -> Optional[Meal]:
        """Get meal by ID"""
        try:
            meal_doc = await self.collection.find_one({"_id": ObjectId(meal_id)})
            if meal_doc:
                # Convert ObjectId fields to strings
                meal_doc['_id'] = str(meal_doc['_id'])
                meal_doc['chef_id'] = str(meal_doc['chef_id'])
                return Meal(**meal_doc)
            return None
        except:
            return None

    async def update_meal(self, meal_id: str, meal_data: MealCreate) -> Optional[Meal]:
        """Update meal"""
        try:
            update_dict = meal_data.dict()
            update_dict['updated_at'] = datetime.utcnow()

            result = await self.collection.update_one(
                {"_id": ObjectId(meal_id)},
                {"$set": update_dict}
            )

            if result.modified_count > 0:
                return await self.get_meal_by_id(meal_id)
            return None
        except:
            return None

    async def delete_meal(self, meal_id: str) -> bool:
        """Delete meal"""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(meal_id)})
            return result.deleted_count > 0
        except:
            return False

    async def get_all_meals(self) -> List[Meal]:
        """Get all meals"""
        cursor = self.collection.find()
        meals = []
        async for meal_doc in cursor:
            # Convert ObjectId fields to strings
            meal_doc['_id'] = str(meal_doc['_id'])
            meal_doc['chef_id'] = str(meal_doc['chef_id'])
            meals.append(Meal(**meal_doc))
        return meals
    
    async def update_meal_visibility(self, meal_id: str, visibility: bool) -> Optional[Meal]:
        """Update meal visibility"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(meal_id)},
                {"$set": {"meal_visibility": visibility}}
            )
    
            if result.modified_count > 0:
                return await self.get_meal_by_id(meal_id)
            return None
        except:
            return None

