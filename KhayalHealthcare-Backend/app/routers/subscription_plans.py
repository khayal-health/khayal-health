from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.models.subscription_plan import PlanType
from app.schemas.subscription_plan import (
    SubscriptionPlanCreate, 
    SubscriptionPlanResponse, 
    SubscriptionPlanUpdate,
    SubscriptionPlanVisibilityUpdate
)
from app.services.subscription_plan import SubscriptionPlanService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
import logging

router = APIRouter(
    prefix="/subscription-plans",
    tags=["subscription plans"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

@router.get("", response_model=List[SubscriptionPlanResponse])
async def get_all_subscription_plans(
    include_hidden: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all subscription plans"""
    plan_service = SubscriptionPlanService(db)
    
    # Only admin can see hidden plans
    if include_hidden and current_user.role != "admin":
        include_hidden = False
    
    plans = await plan_service.get_all_plans(include_hidden)
    return [plan.dict(by_alias=True) for plan in plans]

@router.get("/type/{plan_type}", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans_by_type(
    plan_type: PlanType,
    include_hidden: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get subscription plans by type"""
    plan_service = SubscriptionPlanService(db)
    
    # Only admin can see hidden plans
    if include_hidden and current_user.role != "admin":
        include_hidden = False
    
    plans = await plan_service.get_plans_by_type(plan_type, include_hidden)
    return [plan.dict(by_alias=True) for plan in plans]

@router.get("/{plan_id}", response_model=SubscriptionPlanResponse)
async def get_subscription_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get subscription plan by ID"""
    plan_service = SubscriptionPlanService(db)
    
    # Try to get by MongoDB ID first
    plan = await plan_service.get_plan_by_id(plan_id)
    
    # If not found, try by plan_id
    if not plan:
        plan = await plan_service.get_plan_by_plan_id(plan_id)
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Non-admin users can't see hidden plans
    if not plan.visibility and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    return plan.dict(by_alias=True)

@router.post("", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_plan(
    plan_data: SubscriptionPlanCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new subscription plan (admin only)"""
    try:
        plan_service = SubscriptionPlanService(db)
        plan = await plan_service.create_subscription_plan(plan_data)
        return plan.dict(by_alias=True)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating subscription plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription plan"
        )

@router.put("/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_subscription_plan(
    plan_id: str,
    plan_update: SubscriptionPlanUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update subscription plan (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    updated_plan = await plan_service.update_plan(plan_id, plan_update)
    if not updated_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found or could not be updated"
        )
    
    return updated_plan.dict(by_alias=True)

@router.patch("/{plan_id}/visibility", response_model=SubscriptionPlanResponse)
async def update_plan_visibility(
    plan_id: str,
    visibility_update: SubscriptionPlanVisibilityUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update subscription plan visibility (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    updated_plan = await plan_service.update_plan_visibility(plan_id, visibility_update.visibility)
    if not updated_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found or could not be updated"
        )
    
    return updated_plan.dict(by_alias=True)

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription_plan(
    plan_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete subscription plan (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    success = await plan_service.delete_plan(plan_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found or could not be deleted"
        )
    
    return None

@router.post("/bulk", response_model=List[SubscriptionPlanResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_subscription_plans(
    plans: List[SubscriptionPlanCreate],
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create multiple subscription plans at once (admin only)"""
    plan_service = SubscriptionPlanService(db)
    
    created_plans = await plan_service.bulk_create_plans(plans)
    return [plan.dict(by_alias=True) for plan in created_plans]

# Public endpoint for getting visible plans by type (no auth required)
@router.get("/public/{plan_type}", response_model=List[SubscriptionPlanResponse])
async def get_public_subscription_plans(
    plan_type: PlanType,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get visible subscription plans by type (public endpoint)"""
    plan_service = SubscriptionPlanService(db)
    plans = await plan_service.get_plans_by_type(plan_type, include_hidden=False)
    return [plan.dict(by_alias=True) for plan in plans]
