from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User
from app.schemas.coupon import (
    CouponCreate, CouponResponse, CouponUpdate, CouponApply,
    CouponValidateResponse, BulkCouponCreate
)
from app.services.coupon import CouponService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
import logging

router = APIRouter(
    prefix="/coupons",
    tags=["coupons"],
    responses={401: {"description": "Unauthorized"}},
)

logger = logging.getLogger(__name__)

# Admin endpoints

@router.post("/admin/create", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    coupon_data: CouponCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new coupon (admin only)"""
    try:
        coupon_service = CouponService(db)
        coupon = await coupon_service.create_coupon(coupon_data, str(admin_user.id))
        return coupon.dict(by_alias=True)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create coupon"
        )

@router.post("/admin/bulk-create", response_model=List[CouponResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_coupons(
    bulk_data: BulkCouponCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Generate multiple coupons with unique codes (admin only)"""
    try:
        coupon_service = CouponService(db)
        coupons = await coupon_service.generate_bulk_coupons(bulk_data, str(admin_user.id))
        return [coupon.dict(by_alias=True) for coupon in coupons]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create bulk coupons: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create bulk coupons"
        )

@router.get("/admin/all", response_model=List[CouponResponse])
async def get_all_coupons(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all coupons (admin only)"""
    coupon_service = CouponService(db)
    coupons = await coupon_service.get_all_coupons()
    return [coupon.dict(by_alias=True) for coupon in coupons]

@router.get("/admin/{coupon_id}", response_model=CouponResponse)
async def get_coupon_by_id(
    coupon_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific coupon by ID (admin only)"""
    coupon_service = CouponService(db)
    coupon = await coupon_service.get_coupon_by_id(coupon_id)
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return coupon.dict(by_alias=True)

@router.patch("/admin/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: str,
    update_data: CouponUpdate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a coupon (admin only)"""
    coupon_service = CouponService(db)
    updated_coupon = await coupon_service.update_coupon(coupon_id, update_data)
    
    if not updated_coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return updated_coupon.dict(by_alias=True)

@router.delete("/admin/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a coupon (admin only)"""
    coupon_service = CouponService(db)
    success = await coupon_service.delete_coupon(coupon_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    

@router.get("/admin/{coupon_id}/statistics", response_model=dict)
async def get_coupon_statistics(
    coupon_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get detailed statistics for a coupon (admin only)"""
    coupon_service = CouponService(db)
    stats = await coupon_service.get_coupon_statistics(coupon_id)
    
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return stats

# User endpoints

@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    coupon_apply: CouponApply,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Validate if a coupon can be applied (for users)"""
    coupon_service = CouponService(db)
    
    is_valid, message, discount, usage_info = await coupon_service.validate_coupon(
        coupon_apply.code,
        str(current_user.id),
        coupon_apply.order_total
    )
    
    response = {
        "valid": is_valid,
        "message": message
    }
    
    if is_valid and discount is not None:
        response["discount_amount"] = discount
        response["final_amount"] = coupon_apply.order_total - discount
        if usage_info:
            response["user_usage_count"] = usage_info["user_usage_count"]
            response["user_remaining_uses"] = usage_info["user_remaining_uses"]
    
    return response

@router.post("/apply", response_model=dict)
async def apply_coupon_to_order(
    code: str,
    order_id: str,
    order_total: float,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Apply a coupon to an order (for users)"""
    coupon_service = CouponService(db)
    
    success, message, discount = await coupon_service.apply_coupon(
        code,
        str(current_user.id),
        order_id,
        order_total
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {
        "success": success,
        "message": message,
        "discount_applied": discount,
        "final_amount": order_total - discount if discount else order_total
    }

@router.get("/my-usage", response_model=List[dict])
async def get_my_coupon_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get coupon usage history for the current user"""
    coupon_service = CouponService(db)
    usage_records = await coupon_service.get_user_coupon_usage(str(current_user.id))
    
    # Get coupon details for each usage
    usage_with_details = []
    for usage in usage_records:
        usage_dict = usage.dict(by_alias=True)
        
        # Get coupon details
        coupon = await coupon_service.get_coupon_by_id(str(usage.coupon_id))
        if coupon:
            usage_dict["coupon"] = {
                "code": coupon.code,
                "type": coupon.type,
                "discount_percentage": coupon.discount_percentage,
                "discount_amount": coupon.discount_amount
            }
        
        usage_with_details.append(usage_dict)
    
    return usage_with_details
