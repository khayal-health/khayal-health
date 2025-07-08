from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus
from app.schemas.visit_request import (
    CareVisitRequestCreate, CareVisitRequestResponse, CareVisitRequestAssign,
    PsychologistVisitRequestCreate, PsychologistVisitRequestResponse, PsychologistVisitRequestAssign
)
from app.services.visit_request import VisitRequestService
from app.services.user import UserService
from app.config.database import get_database
from app.utils.dependencies import get_current_user, get_admin_user
from app.models.user import UserRole, CareVisitRequestStatus

router = APIRouter(
    prefix="/visit-requests",
    tags=["visit requests"],
    responses={401: {"description": "Unauthorized"}},
)

# Care Visit Requests
@router.post("/care", response_model=CareVisitRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_care_visit_request(
    request_data: CareVisitRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new care visit request"""
    visit_request_service = VisitRequestService(db)
    request = await visit_request_service.create_care_visit_request(request_data)
    return request.dict(by_alias=True)

@router.get("/care/subscriber/{subscriber_id}", response_model=List[dict])
async def get_care_visit_requests_by_subscriber(
    subscriber_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get care visit requests for a specific subscriber"""
    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)
    
    requests = await visit_request_service.get_care_visit_requests_by_subscriber(subscriber_id)
    caretakers = await user_service.get_users_by_role(UserRole.CARETAKER)
    
    # Add caretaker details to requests
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)
        
        # Find caretaker details if assigned
        if request.caretaker_id:
            caretaker = next((c for c in caretakers if c.id == request.caretaker_id), None)
            request_dict["caretaker"] = caretaker.dict(by_alias=True) if caretaker else None
        else:
            request_dict["caretaker"] = None
            
        requests_with_details.append(request_dict)
    
    return requests_with_details

@router.get("/care", response_model=List[dict])
async def get_all_care_visit_requests(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all care visit requests (admin only)"""
    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)
    
    requests = await visit_request_service.get_all_care_visit_requests()
    subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)
    caretakers = await user_service.get_users_by_role(UserRole.CARETAKER)
    
    # Add subscriber and caretaker details
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)
        
        # Find subscriber details
        subscriber = next((s for s in subscribers if s.id == request.subscriber_id), None)
        request_dict["subscriber"] = subscriber.dict(by_alias=True) if subscriber else None
        
        # Find caretaker details if assigned
        if request.caretaker_id:
            caretaker = next((c for c in caretakers if c.id == request.caretaker_id), None)
            request_dict["caretaker"] = caretaker.dict(by_alias=True) if caretaker else None
        else:
            request_dict["caretaker"] = None
            
        requests_with_details.append(request_dict)
    
    return requests_with_details

@router.patch("/care/{request_id}/assign", status_code=status.HTTP_200_OK)
async def assign_caretaker_to_request(
    request_id: str,
    assignment: CareVisitRequestAssign,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Assign caretaker to visit request (admin only)"""
    try:
        visit_request_service = VisitRequestService(db)
        await visit_request_service.assign_caretaker(
            request_id, 
            assignment.caretaker_id,
            assignment.appointment_date_time  # Add this parameter
        )
        return {"message": "Caretaker assigned successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Psychologist Visit Requests
@router.post("/psychologist", response_model=PsychologistVisitRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_psychologist_visit_request(
    request_data: PsychologistVisitRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new psychologist visit request"""
    visit_request_service = VisitRequestService(db)
    request = await visit_request_service.create_psychologist_visit_request(request_data)
    return request.dict(by_alias=True)

@router.get("/psychologist/subscriber/{subscriber_id}", response_model=List[dict])
async def get_psychologist_visit_requests_by_subscriber(
    subscriber_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get psychologist visit requests for a specific subscriber"""
    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)
    
    requests = await visit_request_service.get_psychologist_visit_requests_by_subscriber(subscriber_id)
    psychologists = await user_service.get_users_by_role(UserRole.PSYCHOLOGIST)
    
    # Add psychologist details to requests
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)
        
        # Find psychologist details if assigned
        if request.psychologist_id:
            psychologist = next((p for p in psychologists if p.id == request.psychologist_id), None)
            request_dict["psychologist"] = psychologist.dict(by_alias=True) if psychologist else None
        else:
            request_dict["psychologist"] = None
            
        requests_with_details.append(request_dict)
    
    return requests_with_details

@router.get("/psychologist", response_model=List[dict])
async def get_all_psychologist_visit_requests(
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all psychologist visit requests (admin only)"""
    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)
    
    requests = await visit_request_service.get_all_psychologist_visit_requests()
    subscribers = await user_service.get_users_by_role(UserRole.SUBSCRIBER)
    psychologists = await user_service.get_users_by_role(UserRole.PSYCHOLOGIST)
    
    # Add subscriber and psychologist details
    requests_with_details = []
    for request in requests:
        request_dict = request.dict(by_alias=True)
        
        # Find subscriber details
        subscriber = next((s for s in subscribers if s.id == request.subscriber_id), None)
        request_dict["subscriber"] = subscriber.dict(by_alias=True) if subscriber else None
        
        # Find psychologist details if assigned
        if request.psychologist_id:
            psychologist = next((p for p in psychologists if p.id == request.psychologist_id), None)
            request_dict["psychologist"] = psychologist.dict(by_alias=True) if psychologist else None
        else:
            request_dict["psychologist"] = None
            
        requests_with_details.append(request_dict)
    
    return requests_with_details

@router.patch("/psychologist/{request_id}/assign", status_code=status.HTTP_200_OK)
async def assign_psychologist_to_request(
    request_id: str,
    assignment: PsychologistVisitRequestAssign,
    admin_user: User = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Assign psychologist to visit request (admin only)"""
    try:
        visit_request_service = VisitRequestService(db)
        await visit_request_service.assign_psychologist(
            request_id,
            assignment.psychologist_id,
            assignment.appointment_date_time
        )
        return {"message": "Psychologist assigned successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/caretakers", response_model=List[dict])
async def get_available_caretakers(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all approved caretakers"""
    user_service = UserService(db)
    caretakers = await user_service.get_users_by_role(UserRole.CARETAKER)
    
    # Filter for approved caretakers only
    available_caretakers = []
    for caretaker in caretakers:
        if caretaker.approval_status == ApprovalStatus.APPROVED:
            available_caretakers.append({
                "id": str(caretaker.id),
                "name": caretaker.name,
                "experience": caretaker.experience,
                "email": caretaker.email,
                "phone": caretaker.phone,
                "subscription_status": caretaker.subscription_status or "pending"
            })
    
    return available_caretakers

@router.get("/psychologists", response_model=List[dict])
async def get_available_psychologists(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all approved psychologists"""
    user_service = UserService(db)
    psychologists = await user_service.get_users_by_role(UserRole.PSYCHOLOGIST)
    
    # Filter for approved psychologists only
    available_psychologists = []
    for psychologist in psychologists:
        if psychologist.approval_status == ApprovalStatus.APPROVED:
            available_psychologists.append({
                "id": str(psychologist.id),
                "name": psychologist.name,
                "experience": psychologist.experience,
                "degree": psychologist.degree,
                "phone": psychologist.phone,
                "email": psychologist.email,
                "subscription_status": psychologist.subscription_status or "pending"
            })
    
    return available_psychologists

@router.get("/care/caretaker/assignments", response_model=List[dict])
async def get_caretaker_assignments(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all assignments for the current caretaker with subscriber details"""
    # Verify user is a caretaker
    if current_user.role != UserRole.CARETAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to caretakers only"
        )
    
    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)
    
    # Get assignments for this caretaker
    assignments = await visit_request_service.get_care_visit_requests_by_caretaker(str(current_user.id))
    
    # Get subscriber details
    subscriber_ids = list(set([req.subscriber_id for req in assignments]))
    subscribers = []
    for sub_id in subscriber_ids:
        subscriber = await user_service.get_user_by_id(str(sub_id))
        if subscriber:
            subscribers.append(subscriber)
    
    # Build response with subscriber details
    assignments_with_details = []
    for assignment in assignments:
        assignment_dict = assignment.dict(by_alias=True)
        
        # Find subscriber details
        subscriber = next((s for s in subscribers if str(s.id) == str(assignment.subscriber_id)), None)
        if subscriber:
            assignment_dict["subscriber"] = {
                "id": str(subscriber.id),
                "name": subscriber.name,
                "phone": subscriber.phone,
                "email": subscriber.email,
                "address": subscriber.address,
                "city": subscriber.city,
                "age": subscriber.age,
                "previous_illness": subscriber.previous_illness
            }
        else:
            assignment_dict["subscriber"] = None
            
        assignments_with_details.append(assignment_dict)
    
    return assignments_with_details


@router.patch("/care/{request_id}/caretaker-status", status_code=status.HTTP_200_OK)
async def update_care_request_status_by_caretaker(
    request_id: str,
    status_update: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update care visit request status by caretaker (accept, cancel, in_progress, completed)"""
    # Verify user is a caretaker
    if current_user.role != UserRole.CARETAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to caretakers only"
        )
    
    # Validate status
    new_status = status_update.get("status")
    allowed_statuses = ["accepted", "cancelled", "in_progress", "completed"]
    
    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Allowed values: {', '.join(allowed_statuses)}"
        )
    
    visit_request_service = VisitRequestService(db)
    
    # Verify the request is assigned to this caretaker
    request = await visit_request_service.get_care_visit_request_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Care visit request not found"
        )
    
    if str(request.caretaker_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update requests assigned to you"
        )
    
    # Update status
    try:
        status_enum = CareVisitRequestStatus(new_status)
        await visit_request_service.update_care_visit_status(request_id, status_enum)
        
        return {
            "message": f"Care visit request status updated to {new_status}",
            "request_id": request_id,
            "new_status": new_status
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )
    

@router.get("/psychologist/psychologist/assignments", response_model=List[dict])
async def get_psychologist_assignments(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all assignments for the current psychologist with subscriber details"""
    # Verify user is a psychologist
    if current_user.role != UserRole.PSYCHOLOGIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to psychologists only"
        )
    
    visit_request_service = VisitRequestService(db)
    user_service = UserService(db)
    
    # Get assignments for this psychologist
    assignments = await visit_request_service.get_psychologist_visit_requests_by_psychologist(str(current_user.id))
    
    # Get subscriber details
    subscriber_ids = list(set([req.subscriber_id for req in assignments]))
    subscribers = []
    for sub_id in subscriber_ids:
        subscriber = await user_service.get_user_by_id(str(sub_id))
        if subscriber:
            subscribers.append(subscriber)
    
    # Build response with subscriber details
    assignments_with_details = []
    for assignment in assignments:
        assignment_dict = assignment.dict(by_alias=True)
        
        # Find subscriber details
        subscriber = next((s for s in subscribers if str(s.id) == str(assignment.subscriber_id)), None)
        if subscriber:
            assignment_dict["subscriber"] = {
                "id": str(subscriber.id),
                "name": subscriber.name,
                "phone": subscriber.phone,
                "email": subscriber.email,
                "address": subscriber.address,
                "city": subscriber.city,
                "age": subscriber.age,
                "previous_illness": subscriber.previous_illness
            }
        else:
            assignment_dict["subscriber"] = None
            
        assignments_with_details.append(assignment_dict)
    
    return assignments_with_details

@router.patch("/psychologist/{request_id}/psychologist-status", status_code=status.HTTP_200_OK)
async def update_psychologist_request_status_by_psychologist(
    request_id: str,
    status_update: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update psychologist visit request status by psychologist (accept, cancel, in_progress, completed)"""
    # Verify user is a psychologist
    if current_user.role != UserRole.PSYCHOLOGIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to psychologists only"
        )
    
    # Validate status
    new_status = status_update.get("status")
    allowed_statuses = ["accepted", "cancelled", "in_progress", "completed"]
    
    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Allowed values: {', '.join(allowed_statuses)}"
        )
    
    visit_request_service = VisitRequestService(db)
    
    # Verify the request is assigned to this psychologist
    request = await visit_request_service.get_psychologist_visit_request_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Psychologist visit request not found"
        )
    
    if str(request.psychologist_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update requests assigned to you"
        )
    try:
        status_enum = CareVisitRequestStatus(new_status)
        await visit_request_service.update_psychologist_visit_status(request_id, status_enum)
        
        return {
            "message": f"Psychologist visit request status updated to {new_status}",
            "request_id": request_id,
            "new_status": new_status
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )


