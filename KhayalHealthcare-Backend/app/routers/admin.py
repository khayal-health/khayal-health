from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus, SubscriptionStatus
from app.schemas.user import UserResponse, SubscriptionUpdate
from app.services.user import UserService
from app.services.order import OrderService
from app.schemas.order import OrderStatusUpdate
from app.config.database import get_database
from app.utils.dependencies import get_admin_user
import logging

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={401: {"description": "Unauthorized"}, 403: {"description": "Forbidden"}},
)

logger = logging.getLogger(__name__)

@router.get("/users/{role}", response_model=List[UserResponse])
async def get_users_by_role(
    role: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get users by role (admin only)"""
    user_service = UserService(db)
    users = await user_service.get_users_by_role(role)
    return [UserResponse(**user.dict(by_alias=True)) for user in users]

@router.patch("/users/{user_id}/approval", status_code=status.HTTP_200_OK)
async def update_user_approval(
    user_id: str,
    approval: dict,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update user approval status (admin only)"""
    try:
        approval_status = ApprovalStatus(approval.get("approval_status"))
        user_service = UserService(db)
        await user_service.update_user_approval_status(user_id, approval_status)
        return {"message": "User approval status updated successfully"}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid approval status"
        )

@router.get("/chefs", response_model=List[dict])
async def get_chef_details(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all chefs with details (admin only)"""
    from app.services.meal import MealService
    
    user_service = UserService(db)
    meal_service = MealService(db)
    
    # Get all chefs
    chefs = await user_service.get_users_by_role(UserRole.CHEF)
    
    # Get meals for each chef
    chefs_with_details = []
    for chef in chefs:
        meals = await meal_service.get_meals_by_chef(str(chef.id))
        chef_dict = chef.dict(by_alias=True)
        chef_dict["meals"] = [meal.dict(by_alias=True) for meal in meals]
        chef_dict["subscription_status"] = chef.subscription_status or "pending"
        chef_dict["subscription_plans"] = chef.subscription_plans or []
        chef_dict["available"] = chef.available 
        chefs_with_details.append(chef_dict)
    
    return chefs_with_details

@router.get("/chef-orders", response_model=List[dict])
async def get_all_chef_orders(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all chef orders (admin only)"""
    from app.services.meal import MealService
    
    user_service = UserService(db)
    order_service = OrderService(db)
    meal_service = MealService(db)
    
    # Get all chefs
    chefs = await user_service.get_users_by_role(UserRole.CHEF)
    
    # Get all subscribers
    subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)
    
    # Get all orders
    all_orders = await order_service.get_all_orders()
    
    # Prepare detailed orders
    orders_with_details = []
    for order in all_orders:
        meal = await meal_service.get_meal_by_id(str(order.meal_id))
        chef = next((c for c in chefs if c.id == order.chef_id), None)
        subscriber = next((s for s in subscribers if s.id == order.subscriber_id), None)
        
        order_detail = order.dict(by_alias=True)
        order_detail["meal"] = meal.dict(by_alias=True) if meal else None
        
        if chef:
            order_detail["chef"] = {
                "id": str(chef.id),
                "name": chef.name,
                "experience": chef.experience
            }
        else:
            order_detail["chef"] = None
            
        if subscriber:
            order_detail["subscriber"] = {
                "id": str(subscriber.id),
                "name": subscriber.name,
                "phone": subscriber.phone
            }
        else:
            order_detail["subscriber"] = None
            
        orders_with_details.append(order_detail)
    
    return orders_with_details

@router.patch("/orders/{order_id}/status", status_code=status.HTTP_200_OK)
async def update_order_status_admin(
    order_id: str,
    status_update: OrderStatusUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update order status (admin only)"""
    try:
        order_service = OrderService(db)
        await order_service.update_order_status(order_id, status_update.status)
        return {"message": "Order status updated successfully"}
    except Exception as e:
        logger.error(f"Failed to update order status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        )

@router.get("/{role}/subscriptions", response_model=List[dict])
async def get_role_subscriptions(
    role: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get subscriptions for users of a specific role (admin only)"""
    try:
        # Validate role
        user_role = UserRole(role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role}. Valid roles are: {', '.join([r.value for r in UserRole])}"
        )
    
    user_service = UserService(db)
    users = await user_service.get_users_by_role(user_role)
    
    # Build response based on role
    users_with_subscriptions = []
    for user in users:
        # Only include approved users (except admins don't need approval)
        if user.approval_status == ApprovalStatus.APPROVED or user_role == UserRole.ADMIN:
            user_data = {
                "id": str(user.id),
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "phone": user.phone,
                "approval_status": user.approval_status,
                "subscription_status": user.subscription_status or "pending",
                "subscription_plan": user.subscription_plans or [] ,
                "subscription_expiry": user.subscription_expiry,
                "subscription_renewal_date": user.subscription_renewal_date,
                "created_at": user.created_at
            }
            
            # Add role-specific fields
            if user_role == UserRole.CARETAKER:
                user_data["experience"] = user.experience
                user_data["degree"] = user.degree
            elif user_role == UserRole.CHEF:
                user_data["experience"] = user.experience
                user_data["degree"] = user.degree
            elif user_role == UserRole.PSYCHOLOGIST:
                user_data["experience"] = user.experience
                user_data["degree"] = user.degree
            elif user_role == UserRole.SUBSCRIBER:
                user_data["age"] = user.age
                user_data["address"] = user.address
                user_data["city"] = user.city
                user_data["previous_illness"] = user.previous_illness
            
            users_with_subscriptions.append(user_data)
    
    return users_with_subscriptions

@router.patch("/users/{user_id}/subscription", status_code=status.HTTP_200_OK)
async def update_user_subscription(
    user_id: str,
    subscription: SubscriptionUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update user subscription details (admin only)"""
    try:
        user_service = UserService(db)

        # Verify user exists
        user = await user_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Update subscription
        await user_service.update_user_subscription(
            user_id,
            subscription.subscription_status,
            subscription.subscription_plans,
            subscription.subscription_expiry,
            subscription.subscription_renewal_date
        )

        return {
            "message": "User subscription updated successfully",
            "user_id": user_id,
            "updated_subscription": {
                "status": subscription.subscription_status,
                "plans": subscription.subscription_plans,
                "expiry": subscription.subscription_expiry,
                "renewal_date": subscription.subscription_renewal_date
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update subscription for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subscription: {str(e)}"
        )

# Add a new endpoint to get all users with subscription info
@router.get("/subscriptions/all", response_model=dict)
async def get_all_subscriptions(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get subscription info for all users grouped by role (admin only)"""
    user_service = UserService(db)
    
    all_subscriptions = {}
    
    for role in UserRole:
        users = await user_service.get_users_by_role(role)
        role_subscriptions = []
        
        for user in users:
            if user.approval_status == ApprovalStatus.APPROVED or role == UserRole.ADMIN:
                role_subscriptions.append({
                    "id": str(user.id),
                    "name": user.name,
                    "username": user.username,
                    "subscription_status": user.subscription_status or "pending",
                    "subscription_plan": user.subscription_plan or "none",
                    "subscription_expiry": user.subscription_expiry,
                    "subscription_renewal_date": user.subscription_renewal_date
                })
        
        all_subscriptions[role.value] = role_subscriptions
    
    return all_subscriptions
