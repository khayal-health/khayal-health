from typing import List, Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import Order, OrderStatus, UserRole
from app.schemas.order import OrderCreate
from datetime import datetime
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class OrderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.orders
        self.users = db.users
        self.meals = db.meals

    async def create_order(self, order_data: OrderCreate) -> Order:
        """Create new order and notify chef and admins"""
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

        order = Order(**order_dict)

        # Send notifications asynchronously
        asyncio.create_task(self._notify_new_order(order))

        return order

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
        """Update order status and notify relevant parties"""
        # Get order details before updating
        order_doc = await self.collection.find_one({"_id": ObjectId(order_id)})
        if not order_doc:
            raise ValueError(f"Order not found: {order_id}")

        # Update the status
        await self.collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )

        # Convert to Order object for notifications
        order_doc['_id'] = str(order_doc['_id'])
        order_doc['subscriber_id'] = str(order_doc['subscriber_id'])
        order_doc['chef_id'] = str(order_doc['chef_id'])
        order_doc['meal_id'] = str(order_doc['meal_id'])
        order_doc['status'] = status  # Use the new status
        order = Order(**order_doc)

        # Send notifications asynchronously
        asyncio.create_task(self._notify_order_status_change(order, status))

    async def get_order_by_id(self, order_id: str) -> Optional[Order]:
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

    # Notification Methods
    async def _notify_new_order(self, order: Order):
        """Notify chef and admins about new order"""
        try:
            # Get chef, subscriber, and meal details
            chef = await self.users.find_one({"_id": ObjectId(order.chef_id)})
            subscriber = await self.users.find_one({"_id": ObjectId(order.subscriber_id)})
            meal = await self.meals.find_one({"_id": ObjectId(order.meal_id)})

            if not chef or not subscriber or not meal:
                logger.error("Missing user or meal data for order notifications")
                return

            # Get all admins
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)

            order_time = order.timestamp.strftime("%B %d, %Y at %I:%M %p")
            
            notification_tasks = []

            # Notify Chef
            chef_subject = "New Order Received - Khayal Healthcare"
            chef_email_body = f"""
Dear {chef.get('name', 'Chef')},

You have received a new order!

Order Details:
- Order ID: {order.id}
- Customer: {subscriber.get('name', 'Unknown')}
- Phone: {subscriber.get('phone', 'Unknown')}
- Meal: {meal.get('name', 'Unknown')}
- Quantity: {order.quantity}
- Total Price: Rs. {order.total_price}
- Delivery Address: {order.delivery_address}
- Order Time: {order_time}

Please log in to your dashboard to confirm this order.

Best regards,
Khayal Healthcare
"""

            chef_whatsapp = f"""🔔 *New Order Received!*

*Order ID:* {order.id}
*Customer:* {subscriber.get('name', 'Unknown')}
*Phone:* {subscriber.get('phone', 'Unknown')}

*Meal:* {meal.get('name', 'Unknown')}
*Quantity:* {order.quantity}
*Total:* Rs. {order.total_price}

*Delivery Address:*
{order.delivery_address}

Please confirm this order in your dashboard.

- Khayal Healthcare"""

            # Add chef notification tasks
            if chef.get('email'):
                notification_tasks.append(
                    self._send_email_notification(chef['email'], chef_subject, chef_email_body, f"chef {chef['email']}")
                )
            if chef.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(chef['phone'], chef_whatsapp, f"chef {chef['phone']}")
                )

            # Notify Admins
            admin_subject = "New Food Order Placed - Khayal Healthcare"
            admin_email_body = f"""
Dear Admin,

A new food order has been placed:

Order Details:
- Order ID: {order.id}
- Customer: {subscriber.get('name', 'Unknown')} ({subscriber.get('phone', 'Unknown')})
- Chef: {chef.get('name', 'Unknown')}
- Meal: {meal.get('name', 'Unknown')}
- Total Price: Rs. {order.total_price}
- Order Time: {order_time}

Please monitor the order progress.

Best regards,
Khayal Healthcare System
"""

            admin_whatsapp = f"""🔔 *New Food Order*

*Order ID:* {order.id}
*Customer:* {subscriber.get('name', 'Unknown')}
*Chef:* {chef.get('name', 'Unknown')}
*Meal:* {meal.get('name', 'Unknown')}
*Total:* Rs. {order.total_price}

Monitor order progress in admin panel.

- Khayal Healthcare"""

            # Add admin notification tasks
            for admin in admins:
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], admin_subject, admin_email_body, f"admin {admin['email']}")
                    )
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], admin_whatsapp, f"admin {admin['phone']}")
                    )

            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in new order notifications: {str(e)}")

    async def _notify_order_status_change(self, order: Order, new_status: OrderStatus):
        """Notify relevant parties about order status changes"""
        try:
            # Get chef, subscriber, and meal details
            chef = await self.users.find_one({"_id": ObjectId(order.chef_id)})
            subscriber = await self.users.find_one({"_id": ObjectId(order.subscriber_id)})
            meal = await self.meals.find_one({"_id": ObjectId(order.meal_id)})

            if not chef or not subscriber or not meal:
                logger.error("Missing user or meal data for status change notifications")
                return

            notification_tasks = []

            # Define status messages
            status_messages = {
                OrderStatus.CONFIRMED: "Your order has been confirmed by the chef and is being prepared.",
                OrderStatus.PREPARING: "Your order is now being prepared by the chef.",
                OrderStatus.READY: "Your order is ready and will be delivered soon.",
                OrderStatus.DELIVERED: "Your order has been delivered. Enjoy your meal!",
                OrderStatus.CANCELLED: "Your order has been cancelled."
            }

            message = status_messages.get(new_status, f"Your order status has been updated to: {new_status}")

            # Notify Subscriber for all status changes
            sub_subject = f"Order Status Update - {new_status.value.title()}"
            sub_email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

{message}

Order Details:
- Order ID: {order.id}
- Meal: {meal.get('name', 'Unknown')}
- Chef: {chef.get('name', 'Unknown')}
- Total Price: Rs. {order.total_price}

Thank you for choosing Khayal Healthcare.

Best regards,
Khayal Healthcare
"""

            sub_whatsapp = f"""🔔 *Order Update*

{message}

*Order ID:* {order.id}
*Meal:* {meal.get('name', 'Unknown')}
*Chef:* {chef.get('name', 'Unknown')}

Thank you for your order!

- Khayal Healthcare"""

            # Add subscriber notification tasks
            if subscriber.get('email'):
                notification_tasks.append(
                    self._send_email_notification(subscriber['email'], sub_subject, sub_email_body, f"subscriber {subscriber['email']}")
                )
            if subscriber.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(subscriber['phone'], sub_whatsapp, f"subscriber {subscriber['phone']}")
                )

            # Notify Admins only for DELIVERED status
            if new_status == OrderStatus.DELIVERED:
                # Get all admins
                admin_cursor = self.users.find({"role": UserRole.ADMIN})
                admins = await admin_cursor.to_list(None)

                admin_subject = "Order Completed - Khayal Healthcare"
                admin_email_body = f"""
Dear Admin,

An order has been successfully delivered:

Order Details:
- Order ID: {order.id}
- Customer: {subscriber.get('name', 'Unknown')} ({subscriber.get('phone', 'Unknown')})
- Chef: {chef.get('name', 'Unknown')}
- Meal: {meal.get('name', 'Unknown')}
- Total Price: Rs. {order.total_price}
- Status: DELIVERED

The order cycle has been completed successfully.

Best regards,
Khayal Healthcare System
"""

                admin_whatsapp = f"""✅ *Order Completed*

*Order ID:* {order.id}
*Customer:* {subscriber.get('name', 'Unknown')}
*Chef:* {chef.get('name', 'Unknown')}
*Total:* Rs. {order.total_price}

Order delivered successfully!

- Khayal Healthcare"""

                # Add admin notification tasks
                for admin in admins:
                    if admin.get('email'):
                        notification_tasks.append(
                            self._send_email_notification(admin['email'], admin_subject, admin_email_body, f"admin {admin['email']}")
                        )
                    if admin.get('phone'):
                        notification_tasks.append(
                            self._send_whatsapp_notification(admin['phone'], admin_whatsapp, f"admin {admin['phone']}")
                        )

            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in order status change notifications: {str(e)}")

    async def _send_email_notification(self, email: str, subject: str, body: str, recipient_type: str):
        """Send email notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_notification, email, subject, body
            )
            logger.info(f"Email notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_type}: {str(e)}")

    async def _send_whatsapp_notification(self, phone: str, message: str, recipient_type: str):
        """Send WhatsApp notification with error handling"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_message, phone, message
            )
            logger.info(f"WhatsApp notification sent to {recipient_type}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {recipient_type}: {str(e)}")
