from typing import List, Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.coupon import Coupon, CouponUsage, CouponType, CouponStatus
from app.schemas.coupon import CouponCreate, CouponUpdate, BulkCouponCreate
from datetime import datetime, timedelta
import random
import string

class CouponService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.coupons
        self.usage_collection = db.coupon_usage
    
    async def create_coupon(self, coupon_data: CouponCreate, admin_id: str) -> Coupon:
        """Create a new coupon"""
        # Check if coupon code already exists
        existing = await self.collection.find_one({"code": coupon_data.code.upper()})
        if existing:
            raise ValueError(f"Coupon with code '{coupon_data.code}' already exists")
        
        coupon_dict = coupon_data.dict()
        coupon_dict['code'] = coupon_dict['code'].upper()
        coupon_dict['created_by'] = ObjectId(admin_id)
        coupon_dict['created_at'] = datetime.utcnow()
        coupon_dict['updated_at'] = datetime.utcnow()
        coupon_dict['current_usage'] = 0
        coupon_dict['user_usage_count'] = {}
        coupon_dict['status'] = CouponStatus.ACTIVE
        
        # Set default valid_from to 1 minute in the past if not provided
        if not coupon_dict.get('valid_from'):
            coupon_dict['valid_from'] = datetime.utcnow() - timedelta(minutes=1)
        
        result = await self.collection.insert_one(coupon_dict)
        
        # Convert ObjectId to string for Pydantic model
        coupon_dict['_id'] = str(result.inserted_id)
        coupon_dict['created_by'] = str(coupon_dict['created_by'])
        
        return Coupon(**coupon_dict)
    
    async def generate_bulk_coupons(self, bulk_data: BulkCouponCreate, admin_id: str) -> List[Coupon]:
        """Generate multiple coupons with unique codes"""
        coupons = []
        
        for i in range(bulk_data.quantity):
            # Generate unique code
            unique_code = self._generate_unique_code(bulk_data.prefix)
            
            # Check if code exists
            attempts = 0
            while await self.collection.find_one({"code": unique_code}) and attempts < 10:
                unique_code = self._generate_unique_code(bulk_data.prefix)
                attempts += 1
            
            if attempts >= 10:
                raise ValueError(f"Failed to generate unique codes. Generated {len(coupons)} out of {bulk_data.quantity}")
            
            # Create coupon data
            coupon_data = CouponCreate(
                code=unique_code,
                type=bulk_data.type,
                discount_percentage=bulk_data.discount_percentage,
                discount_amount=bulk_data.discount_amount,
                usage_limit=bulk_data.usage_limit,
                per_user_limit=bulk_data.per_user_limit,
                valid_from=bulk_data.valid_from,
                valid_until=bulk_data.valid_until
            )
            
            # Create coupon
            coupon = await self.create_coupon(coupon_data, admin_id)
            coupons.append(coupon)
        
        return coupons
    
    def _generate_unique_code(self, prefix: str) -> str:
        """Generate a unique coupon code"""
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"{prefix.upper()}-{suffix}"
    
    async def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        """Get coupon by code"""
        coupon_doc = await self.collection.find_one({"code": code.upper()})
        if coupon_doc:
            # Convert ObjectId fields to strings
            coupon_doc['_id'] = str(coupon_doc['_id'])
            coupon_doc['created_by'] = str(coupon_doc['created_by'])
            # user_usage_count should already be in correct format
            return Coupon(**coupon_doc)
        return None
    
    async def get_all_coupons(self) -> List[Coupon]:
        """Get all coupons (admin only)"""
        cursor = self.collection.find()
        coupons = []
        async for coupon_doc in cursor:
            # Convert ObjectId fields to strings
            coupon_doc['_id'] = str(coupon_doc['_id'])
            coupon_doc['created_by'] = str(coupon_doc['created_by'])
            coupons.append(Coupon(**coupon_doc))
        return coupons
    
    async def update_coupon(self, coupon_id: str, update_data: CouponUpdate) -> Optional[Coupon]:
        """Update coupon"""
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        if update_dict:
            update_dict['updated_at'] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(coupon_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count > 0:
                return await self.get_coupon_by_id(coupon_id)
        return None
    
    async def get_coupon_by_id(self, coupon_id: str) -> Optional[Coupon]:
        """Get coupon by ID"""
        try:
            coupon_doc = await self.collection.find_one({"_id": ObjectId(coupon_id)})
            if coupon_doc:
                # Convert ObjectId fields to strings
                coupon_doc['_id'] = str(coupon_doc['_id'])
                coupon_doc['created_by'] = str(coupon_doc['created_by'])
                return Coupon(**coupon_doc)
            return None
        except:
            return None
    
    async def delete_coupon(self, coupon_id: str) -> bool:
        """Delete coupon"""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(coupon_id)})
            return result.deleted_count > 0
        except:
            return False
    
    async def validate_coupon(self, code: str, user_id: str, order_total: float) -> Tuple[bool, str, Optional[float], Optional[dict]]:
        """Validate if a coupon can be used by a user"""
        coupon = await self.get_coupon_by_code(code)

        if not coupon:
            return False, "Invalid coupon code", None, None

        # Debug log to check times
        now = datetime.utcnow()

        # Check if coupon is active
        if coupon.status != CouponStatus.ACTIVE:
            return False, "Coupon is not active", None, None

        # Check validity dates
        if coupon.valid_from and now < coupon.valid_from:
            return False, "Coupon is not yet valid", None, None
        
        # Check total usage limit
        if coupon.usage_limit is not None and coupon.current_usage >= coupon.usage_limit:
            return False, "Coupon has reached its total usage limit", None, None
        
        # Check per-user usage limit
        user_usage = coupon.user_usage_count.get(user_id, 0)
        if coupon.per_user_limit is not None and user_usage >= coupon.per_user_limit:
            return False, f"You have already used this coupon {user_usage} times (limit: {coupon.per_user_limit})", None, None
        
        # Calculate discount
        if coupon.type == CouponType.PERCENTAGE:
            discount = (order_total * coupon.discount_percentage) / 100
        else:
            discount = min(coupon.discount_amount, order_total)
        
        # Calculate remaining uses for user
        remaining_uses = None
        if coupon.per_user_limit is not None:
            remaining_uses = coupon.per_user_limit - user_usage
        
        usage_info = {
            "user_usage_count": user_usage,
            "user_remaining_uses": remaining_uses
        }
        
        return True, "Coupon is valid", discount, usage_info
    
    async def apply_coupon(self, code: str, user_id: str, order_id: str, order_total: float) -> Tuple[bool, str, Optional[float]]:
        """Apply a coupon to an order"""
        # Validate coupon first
        is_valid, message, discount, usage_info = await self.validate_coupon(code, user_id, order_total)
        
        if not is_valid:
            return False, message, None
        
        coupon = await self.get_coupon_by_code(code)
        
        # Update coupon usage
        update_ops = {
            "$inc": {
                "current_usage": 1,
                f"user_usage_count.{user_id}": 1
            }
        }
        
        await self.collection.update_one(
            {"_id": ObjectId(coupon.id)},
            update_ops
        )
        
        # Record usage
        usage_record = {
            "coupon_id": ObjectId(coupon.id),
            "user_id": ObjectId(user_id),
            "order_id": ObjectId(order_id) if order_id else None,
            "used_at": datetime.utcnow(),
            "discount_applied": discount
        }
        
        await self.usage_collection.insert_one(usage_record)
        
        return True, "Coupon applied successfully", discount
    
    async def get_user_coupon_usage(self, user_id: str) -> List[CouponUsage]:
        """Get coupon usage history for a user"""
        cursor = self.usage_collection.find({"user_id": ObjectId(user_id)})
        usage_records = []
        async for usage_doc in cursor:
            # Convert ObjectId fields to strings
            usage_doc['_id'] = str(usage_doc['_id'])
            usage_doc['coupon_id'] = str(usage_doc['coupon_id'])
            usage_doc['user_id'] = str(usage_doc['user_id'])
            if usage_doc.get('order_id'):
                usage_doc['order_id'] = str(usage_doc['order_id'])
            usage_records.append(CouponUsage(**usage_doc))
        return usage_records
    
    async def get_coupon_statistics(self, coupon_id: str) -> dict:
        """Get detailed statistics for a coupon (admin only)"""
        coupon = await self.get_coupon_by_id(coupon_id)
        if not coupon:
            return None
        
        # Get total discount given
        pipeline = [
            {"$match": {"coupon_id": ObjectId(coupon_id)}},
            {"$group": {
                "_id": None,
                "total_discount": {"$sum": "$discount_applied"},
                "total_uses": {"$sum": 1}
            }}
        ]
        
        stats_cursor = self.usage_collection.aggregate(pipeline)
        stats = await stats_cursor.to_list(1)
        
        total_discount = stats[0]["total_discount"] if stats else 0
        total_uses = stats[0]["total_uses"] if stats else 0
        
        return {
            "coupon_code": coupon.code,
            "total_uses": total_uses,
            "unique_users": len(coupon.user_usage_count),
            "total_discount_given": total_discount,
            "usage_limit": coupon.usage_limit,
            "per_user_limit": coupon.per_user_limit,
            "remaining_uses": (coupon.usage_limit - coupon.current_usage) if coupon.usage_limit else None,
            "user_usage_breakdown": coupon.user_usage_count
        }
