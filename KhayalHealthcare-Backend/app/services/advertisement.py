from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.advertisement import Advertisement, AdvertisementStatus
from app.models.user import UserRole
from app.schemas.advertisement import AdvertisementCreate, AdvertisementUpdate
from datetime import datetime
import os
import shutil
from pathlib import Path

class AdvertisementService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.advertisements
        
    async def create_advertisement(
        self, 
        ad_data: AdvertisementCreate, 
        image_path: str,
        created_by: str
    ) -> Advertisement:
        """Create new advertisement"""
        ad_dict = ad_data.dict()
        ad_dict['image_url'] = image_path
        ad_dict['created_by'] = ObjectId(created_by)
        ad_dict['created_at'] = datetime.utcnow()
        ad_dict['updated_at'] = datetime.utcnow()
        ad_dict['click_count'] = 0
        ad_dict['view_count'] = 0
        ad_dict['status'] = AdvertisementStatus.ACTIVE
        
        result = await self.collection.insert_one(ad_dict)
        
        # Convert ObjectId to string for Pydantic model
        ad_dict['_id'] = str(result.inserted_id)
        ad_dict['created_by'] = str(ad_dict['created_by'])
        
        return Advertisement(**ad_dict)
    
    async def get_all_advertisements(self) -> List[Advertisement]:
        """Get all advertisements (admin only)"""
        cursor = self.collection.find().sort("display_order", 1)
        ads = []
        async for ad_doc in cursor:
            ad_doc['_id'] = str(ad_doc['_id'])
            ad_doc['created_by'] = str(ad_doc['created_by'])
            ads.append(Advertisement(**ad_doc))
        return ads
    
    async def get_advertisements_by_role(self, role: UserRole) -> List[Advertisement]:
        """Get active advertisements for a specific role"""
        now = datetime.utcnow()
        cursor = self.collection.find({
            "target_role": role,
            "status": AdvertisementStatus.ACTIVE,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }).sort("display_order", 1)
        
        ads = []
        async for ad_doc in cursor:
            ad_doc['_id'] = str(ad_doc['_id'])
            ad_doc['created_by'] = str(ad_doc['created_by'])
            ads.append(Advertisement(**ad_doc))
        return ads
    
    async def get_advertisement_by_id(self, ad_id: str) -> Optional[Advertisement]:
        """Get advertisement by ID"""
        try:
            ad_doc = await self.collection.find_one({"_id": ObjectId(ad_id)})
            if ad_doc:
                ad_doc['_id'] = str(ad_doc['_id'])
                ad_doc['created_by'] = str(ad_doc['created_by'])
                return Advertisement(**ad_doc)
            return None
        except:
            return None
    
    async def update_advertisement(
        self, 
        ad_id: str, 
        ad_update: AdvertisementUpdate,
        image_path: Optional[str] = None
    ) -> Optional[Advertisement]:
        """Update advertisement"""
        try:
            update_dict = {k: v for k, v in ad_update.dict().items() if v is not None}
            update_dict['updated_at'] = datetime.utcnow()
            
            if image_path:
                update_dict['image_url'] = image_path
                
            result = await self.collection.update_one(
                {"_id": ObjectId(ad_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_advertisement_by_id(ad_id)
            return None
        except:
            return None
    
    async def delete_advertisement(self, ad_id: str) -> bool:
        """Delete advertisement and its image"""
        try:
            # Get ad to find image path
            ad = await self.get_advertisement_by_id(ad_id)
            if ad:
                # Delete image file if exists
                if ad.image_url and os.path.exists(ad.image_url):
                    os.remove(ad.image_url)
                    
                # Delete from database
                result = await self.collection.delete_one({"_id": ObjectId(ad_id)})
                return result.deleted_count > 0
            return False
        except:
            return False
    
    async def increment_view_count(self, ad_id: str):
        """Increment view count for an advertisement"""
        await self.collection.update_one(
            {"_id": ObjectId(ad_id)},
            {"$inc": {"view_count": 1}}
        )
    
    async def increment_click_count(self, ad_id: str):
        """Increment click count for an advertisement"""
        await self.collection.update_one(
            {"_id": ObjectId(ad_id)},
            {"$inc": {"click_count": 1}}
        )
    
    async def update_expired_advertisements(self):
        """Update status of expired advertisements"""
        now = datetime.utcnow()
        await self.collection.update_many(
            {
                "status": AdvertisementStatus.ACTIVE,
                "end_date": {"$lt": now}
            },
            {"$set": {"status": AdvertisementStatus.EXPIRED}}
        )
