from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.services.order import OrderService
from app.services.user import UserService
from app.services.meal import MealService
from app.config.database import get_database
from app.utils.dependencies import get_current_user
import logging

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

@router.get("/chef/my-orders", response_model=List[dict])
async def get_orders_by_chef(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get orders for the currently logged-in chef"""
    try:
        # Verify that the current user is a chef
        if current_user.role != UserRole.CHEF:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to chefs only"
            )
        
        # Use the current user's ID as the chef_id
        chef_id = str(current_user.id)
        
        order_service = OrderService(db)
        user_service = UserService(db)
        meal_service = MealService(db)

        # Get orders for the chef
        orders = await order_service.get_orders_by_chef(chef_id)
        
        # Get all subscribers
        subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)

        # Add subscriber and meal details to each order
        orders_with_details = []
        for order in orders:
            order_dict = order.dict(by_alias=True)
            
            # Convert subscriber_id to string for comparison
            subscriber_id_str = str(order.subscriber_id)
            
            # Find matching subscriber
            subscriber = None
            for s in subscribers:
                if str(s.id) == subscriber_id_str:
                    subscriber = s
                    break
            
            if subscriber:
                order_dict["subscriber"] = {
                    "name": subscriber.name,
                    "phone": subscriber.phone,
                    "address": subscriber.address,
                    "city": subscriber.city,
                    "previous_illness": subscriber.previous_illness
                }
            else:
                order_dict["subscriber"] = None
            
            # Get meal details
            try:
                meal = await meal_service.get_meal_by_id(str(order.meal_id))
                if meal:
                    order_dict["meal"] = meal.dict(by_alias=True)
                else:
                    order_dict["meal"] = None
            except Exception as e:
                logger.warning(f"Failed to get meal details for meal_id {order.meal_id}: {str(e)}")
                order_dict["meal"] = None

            orders_with_details.append(order_dict)

        return orders_with_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_orders_by_chef: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get orders: {str(e)}"
        )

@router.get("/my-orders", response_model=List[dict])
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get orders for the currently logged-in subscriber"""
    try:
        # Check if the current user is a subscriber
        if current_user.role != UserRole.SUBSCRIBER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only subscribers can view their orders"
            )
        
        # Use the current user's ID
        subscriber_id = str(current_user.id)
        
        order_service = OrderService(db)
        meal_service = MealService(db)
        user_service = UserService(db)
        
        # Get orders for the subscriber
        orders = await order_service.get_orders_by_subscriber(subscriber_id)
        
        # Get all chefs
        chefs = await user_service.get_users_by_role(UserRole.CHEF)
        
        # Add chef and meal details to each order
        orders_with_details = []
        for order in orders:
            order_dict = order.dict(by_alias=True)
            
            # Find matching chef
            chef = None
            for c in chefs:
                if str(c.id) == str(order.chef_id):
                    chef = c
                    break
            
            if chef:
                order_dict["chef"] = {
                    "id": str(chef.id),
                    "name": chef.name,
                    "experience": chef.experience,
                    "degree": chef.degree
                }
            else:
                order_dict["chef"] = None
            
            # Get meal details
            try:
                meal = await meal_service.get_meal_by_id(str(order.meal_id))
                if meal:
                    order_dict["meal"] = meal.dict(by_alias=True)
                else:
                    order_dict["meal"] = None
            except Exception as e:
                logger.warning(f"Failed to get meal details for meal_id {order.meal_id}: {str(e)}")
                order_dict["meal"] = None
            
            orders_with_details.append(order_dict)
        
        return orders_with_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_my_orders: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get orders: {str(e)}"
        )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new order - notifications will be sent automatically"""
    order_service = OrderService(db)
    meal_service = MealService(db)
    user_service = UserService(db)

    try:
        # Validate ObjectIds
        for field, value in [("subscriber_id", order_data.subscriber_id), 
                           ("chef_id", order_data.chef_id), 
                           ("meal_id", order_data.meal_id)]:
            if not ObjectId.is_valid(value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid {field} format: {value}"
                )
        
        # Create order - notifications will be sent automatically in the service
        order = await order_service.create_order(order_data)

        # Get related data for response
        meal = await meal_service.get_meal_by_id(str(order.meal_id))
        chef = await user_service.get_user_by_id(str(order.chef_id))

        # Return complete order details
        return {
            "order": order.dict(by_alias=True),
            "meal": meal.dict(by_alias=True) if meal else None,
            "chef": {
                "id": str(chef.id),
                "name": chef.name,
                "experience": chef.experience,
                "degree": chef.degree
            } if chef else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create order: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )

@router.patch("/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update order status - notifications will be sent automatically"""
    try:
        # Validate order_id is a valid ObjectId
        if not ObjectId.is_valid(order_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order ID format: {order_id}"
            )
            
        order_service = OrderService(db)
        
        # For chef users, verify they own the order
        if current_user.role == UserRole.CHEF:
            order = await order_service.get_order_by_id(order_id)
            if not order:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Order not found"
                )
            if str(order.chef_id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own orders"
                )
        
        # Update status - notifications will be sent automatically in the service
        await order_service.update_order_status(order_id, status_update.status)
        
        return {
            "message": "Order status updated successfully",
            "order_id": order_id,
            "new_status": status_update.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update order status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        )
