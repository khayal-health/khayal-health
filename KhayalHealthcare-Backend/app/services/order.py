from typing import List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Order, OrderStatus
from app.schemas.order import OrderCreate
from datetime import datetime

class OrderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.orders

    async def create_order(self, order_data: OrderCreate) -> Order:
        """Create new order"""
        order_dict = order_data.dict()
        order_dict['subscriber_id'] = ObjectId(order_data.subscriber_id)
        order_dict['chef_id'] = ObjectId(order_data.chef_id)
        order_dict['meal_id'] = ObjectId(order_data.meal_id)
        order_dict['status'] = OrderStatus.PENDING
        order_dict['timestamp'] = datetime.utcnow()

        result = await self.collection.insert_one(order_dict)

        # Convert ObjectIds to strings for Pydantic model
        order_dict['_id'] = str(result.inserted_id)
        order_dict['subscriber_id'] = str(order_dict['subscriber_id'])
        order_dict['chef_id'] = str(order_dict['chef_id'])
        order_dict['meal_id'] = str(order_dict['meal_id'])

        return Order(**order_dict)

    async def get_orders_by_chef(self, chef_id: str) -> List[Order]:
        """Get all orders for a chef"""
        cursor = self.collection.find({"chef_id": ObjectId(chef_id)})
        orders = []
        async for order_doc in cursor:
            # Convert ObjectId to string for all id fields
            order_doc['_id'] = str(order_doc['_id'])
            order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
            order_doc['chef_id'] = str(order_doc['chef_id'])
            order_doc['meal_id'] = str(order_doc['meal_id'])
            orders.append(Order(**order_doc))
        return orders

    async def get_orders_by_subscriber(self, subscriber_id: str) -> List[Order]:
        """Get all orders for a subscriber"""
        cursor = self.collection.find({"subscriber_id": ObjectId(subscriber_id)})
        orders = []
        async for order_doc in cursor:
            # Convert ObjectId to string for all id fields
            order_doc['_id'] = str(order_doc['_id'])
            order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
            order_doc['chef_id'] = str(order_doc['chef_id'])
            order_doc['meal_id'] = str(order_doc['meal_id'])
            orders.append(Order(**order_doc))
        return orders

    async def get_all_orders(self) -> List[Order]:
        """Get all orders (admin)"""
        cursor = self.collection.find()
        orders = []
        async for order_doc in cursor:
            # Convert ObjectId to string for all id fields
            order_doc['_id'] = str(order_doc['_id'])
            order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
            order_doc['chef_id'] = str(order_doc['chef_id'])
            order_doc['meal_id'] = str(order_doc['meal_id'])
            orders.append(Order(**order_doc))
        return orders

    async def update_order_status(self, order_id: str, status: OrderStatus):
        """Update order status"""
        await self.collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )

    async def get_order_by_id(self, order_id: str):
        """Get order by ID"""
        try:
            order_doc = await self.collection.find_one({"_id": ObjectId(order_id)})
            if order_doc:
                # Convert ObjectId to string for all id fields
                order_doc['_id'] = str(order_doc['_id'])
                order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
                order_doc['chef_id'] = str(order_doc['chef_id'])
                order_doc['meal_id'] = str(order_doc['meal_id'])
                return Order(**order_doc)
            return None
        except:
            return None
