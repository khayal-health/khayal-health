from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.subscription_plan import SubscriptionPlan, PlanType
from app.schemas.subscription_plan import SubscriptionPlanCreate, SubscriptionPlanUpdate
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SubscriptionPlanService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.subscription_plans
    
    async def create_subscription_plan(self, plan_data: SubscriptionPlanCreate) -> SubscriptionPlan:
        """Create a new subscription plan"""
        # Check if plan_id already exists
        existing_plan = await self.collection.find_one({"plan_id": plan_data.plan_id})
        if existing_plan:
            raise ValueError(f"Subscription plan with ID '{plan_data.plan_id}' already exists")
        
        plan_dict = plan_data.dict()
        plan_dict['created_at'] = datetime.utcnow()
        plan_dict['updated_at'] = datetime.utcnow()
        
        # Convert nested models to dicts
        plan_dict['numeric'] = plan_data.numeric.dict()
        plan_dict['billing'] = plan_data.billing.dict()
        
        result = await self.collection.insert_one(plan_dict)
        plan_dict['_id'] = str(result.inserted_id)
        
        return SubscriptionPlan(**plan_dict)
    
    async def get_all_plans(self, include_hidden: bool = False) -> List[SubscriptionPlan]:
        """Get all subscription plans"""
        query = {} if include_hidden else {"visibility": True}
        cursor = self.collection.find(query)
        plans = []
        async for plan_doc in cursor:
            plan_doc['_id'] = str(plan_doc['_id'])
            plans.append(SubscriptionPlan(**plan_doc))
        return plans
    
    async def get_plans_by_type(self, plan_type: PlanType, include_hidden: bool = False) -> List[SubscriptionPlan]:
        """Get subscription plans by type"""
        query = {"type": plan_type}
        if not include_hidden:
            query["visibility"] = True
        
        cursor = self.collection.find(query)
        plans = []
        async for plan_doc in cursor:
            plan_doc['_id'] = str(plan_doc['_id'])
            plans.append(SubscriptionPlan(**plan_doc))
        return plans
    
    async def get_plan_by_id(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan by MongoDB ID"""
        try:
            plan_doc = await self.collection.find_one({"_id": ObjectId(plan_id)})
            if plan_doc:
                plan_doc['_id'] = str(plan_doc['_id'])
                return SubscriptionPlan(**plan_doc)
            return None
        except Exception as e:
            logger.error(f"Error fetching plan by ID: {str(e)}")
            return None
    
    async def get_plan_by_plan_id(self, plan_id: str) -> Optional[SubscriptionPlan]:
        """Get subscription plan by plan_id (e.g., 'food-basic')"""
        plan_doc = await self.collection.find_one({"plan_id": plan_id})
        if plan_doc:
            plan_doc['_id'] = str(plan_doc['_id'])
            return SubscriptionPlan(**plan_doc)
        return None
    
    async def update_plan(self, plan_id: str, plan_update: SubscriptionPlanUpdate) -> Optional[SubscriptionPlan]:
        """Update subscription plan"""
        try:
            update_dict = {}
            
            # Only include non-None values
            for field, value in plan_update.dict(exclude_unset=True).items():
                if value is not None:
                    if field == 'numeric':
                        update_dict['numeric'] = value
                    elif field == 'billing':
                        update_dict['billing'] = value
                    else:
                        update_dict[field] = value
            
            if update_dict:
                update_dict['updated_at'] = datetime.utcnow()
                
                result = await self.collection.update_one(
                    {"_id": ObjectId(plan_id)},
                    {"$set": update_dict}
                )
                
                if result.modified_count > 0:
                    return await self.get_plan_by_id(plan_id)
            
            return None
        except Exception as e:
            logger.error(f"Error updating plan: {str(e)}")
            return None
    
    async def update_plan_visibility(self, plan_id: str, visibility: bool) -> Optional[SubscriptionPlan]:
        """Update plan visibility"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(plan_id)},
                {"$set": {"visibility": visibility, "updated_at": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                return await self.get_plan_by_id(plan_id)
            return None
        except Exception as e:
            logger.error(f"Error updating plan visibility: {str(e)}")
            return None
    
    async def delete_plan(self, plan_id: str) -> bool:
        """Delete subscription plan"""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(plan_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting plan: {str(e)}")
            return False
    
    async def bulk_create_plans(self, plans: List[SubscriptionPlanCreate]) -> List[SubscriptionPlan]:
        """Create multiple subscription plans at once"""
        created_plans = []
        for plan_data in plans:
            try:
                plan = await self.create_subscription_plan(plan_data)
                created_plans.append(plan)
            except ValueError as e:
                logger.warning(f"Skipping plan {plan_data.plan_id}: {str(e)}")
                continue
        return created_plans
