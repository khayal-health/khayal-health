from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole
from app.schemas.meal import MealCreate, MealResponse
from app.services.meal import MealService
from app.config.database import get_database
from app.utils.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/meals",
    tags=["meals"],
    responses={401: {"description": "Unauthorized"}},
)

class MealVisibilityUpdate(BaseModel):
    meal_visibility: bool

@router.get("/my-meals", response_model=List[MealResponse])
async def get_my_meals(
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get meals for the authenticated chef"""
    # Validate that current user is a chef
    if current_user.role != UserRole.CHEF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chefs can access their meals"
        )

    meal_service = MealService(db)
    meals = await meal_service.get_meals_by_chef(str(current_user.id))
    return [meal.dict(by_alias=True) for meal in meals]


@router.get("/chef/{chef_id}", response_model=List[MealResponse])
async def get_meals_by_chef(
        chef_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get meals for a specific chef (for subscribers/admin viewing)"""
    meal_service = MealService(db)
    meals = await meal_service.get_meals_by_chef(chef_id)
    return [meal.dict(by_alias=True) for meal in meals]


@router.get("/all", response_model=List[dict])
async def get_all_meals(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all meals from all available chefs with chef details"""
    from app.services.user import UserService
    
    meal_service = MealService(db)
    user_service = UserService(db)
    
    # Get all chefs
    chefs = await user_service.get_users_by_role(UserRole.CHEF)
    
    # Get all meals
    all_meals = []
    for chef in chefs:
        # Check if chef is approved AND available
        if chef.approval_status == "approved" and chef.available:
            meals = await meal_service.get_meals_by_chef(str(chef.id))
            for meal in meals:
                if meal.meal_visibility:  # Still check meal visibility
                    meal_dict = meal.dict(by_alias=True)
                    meal_dict["chef"] = {
                        "id": str(chef.id),
                        "name": chef.name,
                        "experience": chef.experience,
                        "degree": chef.degree
                    }
                    all_meals.append(meal_dict)
    
    return all_meals


@router.post("", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
async def create_meal(
        meal_data: MealCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new meal (chef only)"""
    # Validate that current user is a chef
    if current_user.role != UserRole.CHEF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chefs can create meals"
        )

    # Auto-assign chef_id from authenticated user
    meal_service = MealService(db)
    meal = await meal_service.create_meal(meal_data, str(current_user.id))
    return meal.dict(by_alias=True)


@router.put("/{meal_id}", response_model=MealResponse)
async def update_meal(
        meal_id: str,
        meal_data: MealCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update meal (chef only, own meals)"""
    if current_user.role != UserRole.CHEF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chefs can update meals"
        )

    meal_service = MealService(db)

    # Check if meal belongs to the chef
    existing_meal = await meal_service.get_meal_by_id(meal_id)
    if not existing_meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )

    if str(existing_meal.chef_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own meals"
        )

    # Update the meal
    updated_meal = await meal_service.update_meal(meal_id, meal_data)
    return updated_meal.dict(by_alias=True)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal(
        meal_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete meal (chef only, own meals)"""
    if current_user.role != UserRole.CHEF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chefs can delete meals"
        )

    meal_service = MealService(db)

    # Check if meal belongs to the chef
    existing_meal = await meal_service.get_meal_by_id(meal_id)
    if not existing_meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )

    if str(existing_meal.chef_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own meals"
        )

    # Delete the meal
    await meal_service.delete_meal(meal_id)
    return None

@router.get("/chefs-with-meals", response_model=List[dict])
async def get_chefs_with_meals(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user.role is not UserRole.SUBSCRIBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only subscribers and chefs can access this endpoint"
        )
    
    from app.services.user import UserService
    
    meal_service = MealService(db)
    user_service = UserService(db)
    
    chefs = await user_service.get_users_by_role(UserRole.CHEF)
    chefs_with_meals = []
    
    for chef in chefs:
        # Check if chef is approved AND available
        if chef.approval_status == "approved" and chef.available:
            meals = await meal_service.get_meals_by_chef(str(chef.id))
            formatted_meals = []
            for meal in meals:
                if meal.meal_visibility:
                    meal_dict = meal.dict(by_alias=True)
                    formatted_meals.append(meal_dict)
            
            chef_data = {
                "id": str(chef.id),
                "name": chef.name,
                "experience": chef.experience,
                "degree": chef.degree,
                "available": chef.available,
                "meals": formatted_meals
            }
            
            chefs_with_meals.append(chef_data)
    
    return chefs_with_meals

@router.patch("/{meal_id}/visibility", response_model=MealResponse)
async def update_meal_visibility(
    meal_id: str,
    visibility_update: MealVisibilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update meal visibility"""
    meal_service = MealService(db)
    updated_meal = await meal_service.update_meal_visibility(meal_id, visibility_update.meal_visibility)
    
    if not updated_meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found or could not be updated"
        )
    
    return updated_meal.dict(by_alias=True)