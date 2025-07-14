from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import CareVisitRequest, PsychologistVisitRequest, CareVisitRequestStatus, UserRole
from app.schemas.visit_request import CareVisitRequestCreate, PsychologistVisitRequestCreate
from datetime import datetime
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class VisitRequestService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.care_visits = db.care_visit_requests
        self.psych_visits = db.psychologist_visit_requests
        self.users = db.users

    # Care Visit Requests
    async def create_care_visit_request(self, request_data: CareVisitRequestCreate) -> CareVisitRequest:
        """Create new care visit request and notify admins"""
        request_dict = request_data.dict()
        request_dict['subscriber_id'] = ObjectId(request_data.subscriber_id)
        request_dict['status'] = CareVisitRequestStatus.PENDING
        request_dict['created_at'] = datetime.utcnow()
    
        result = await self.care_visits.insert_one(request_dict)
        
        # Convert ObjectId to string for Pydantic model
        request_dict['_id'] = str(result.inserted_id)
        request_dict['subscriber_id'] = str(request_dict['subscriber_id'])
        
        # Get subscriber details
        subscriber = await self.users.find_one({"_id": ObjectId(request_data.subscriber_id)})
        
        # Notify all admins - Don't wait for this to complete
        asyncio.create_task(self._notify_admins_new_care_request(subscriber, request_dict['_id']))
    
        return CareVisitRequest(**request_dict)

    async def get_all_care_visit_requests(self) -> List[CareVisitRequest]:
        """Get all care visit requests (admin)"""
        cursor = self.care_visits.find()
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('caretaker_id'):
                request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
            requests.append(CareVisitRequest(**request_doc))
        return requests
    
    async def get_care_visit_requests_by_subscriber(self, subscriber_id: str) -> List[CareVisitRequest]:
        """Get care visit requests for a specific subscriber"""
        cursor = self.care_visits.find({"subscriber_id": ObjectId(subscriber_id)})
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('caretaker_id'):
                request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
            requests.append(CareVisitRequest(**request_doc))
        return requests

    async def get_care_visit_requests_by_caretaker(self, caretaker_id: str) -> List[CareVisitRequest]:
        """Get all care visit requests assigned to a specific caretaker"""
        cursor = self.care_visits.find({"caretaker_id": ObjectId(caretaker_id)})
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('caretaker_id'):
                request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
            requests.append(CareVisitRequest(**request_doc))
        return requests
    
    async def get_care_visit_request_by_id(self, request_id: str) -> Optional[CareVisitRequest]:
        """Get a specific care visit request by ID"""
        try:
            request_doc = await self.care_visits.find_one({"_id": ObjectId(request_id)})
            if request_doc:
                # Convert ObjectId fields to strings
                request_doc['_id'] = str(request_doc['_id'])
                request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
                if request_doc.get('caretaker_id'):
                    request_doc['caretaker_id'] = str(request_doc['caretaker_id'])
                return CareVisitRequest(**request_doc)
            return None
        except Exception as e:
            logger.error(f"Error getting care visit request {request_id}: {str(e)}")
            return None

    async def assign_caretaker(self, request_id: str, caretaker_id: str, appointment_datetime: datetime):
        """Assign caretaker to visit request with appointment time"""
        # Validate ObjectIds first
        if not ObjectId.is_valid(request_id):
            raise ValueError(f"Invalid request ID: {request_id}")
        
        if not ObjectId.is_valid(caretaker_id):
            raise ValueError(f"Invalid caretaker ID: {caretaker_id}")
        
        # Get request details before updating
        request = await self.care_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise ValueError(f"Request not found: {request_id}")
        
        # Update the request
        await self.care_visits.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "caretaker_id": ObjectId(caretaker_id),
                    "appointment_date_time": appointment_datetime,
                    "status": CareVisitRequestStatus.ASSIGNED
                }
            }
        )

        # Get subscriber and caretaker details
        subscriber = await self.users.find_one({"_id": request['subscriber_id']})
        caretaker = await self.users.find_one({"_id": ObjectId(caretaker_id)})
        
        # Send notifications - Don't wait for this to complete
        asyncio.create_task(self._notify_caretaker_assignment(subscriber, caretaker, appointment_datetime))

    async def update_care_visit_status(self, request_id: str, status: CareVisitRequestStatus):
        """Update care visit request status and notify if needed"""
        # Get request details
        request = await self.care_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            return

        # Update status
        await self.care_visits.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": status}}
        )

        # Send notifications for important status changes
        if status in [
            CareVisitRequestStatus.ACCEPTED, 
            CareVisitRequestStatus.IN_PROGRESS, 
            CareVisitRequestStatus.COMPLETED, 
            CareVisitRequestStatus.CANCELLED
        ]:
            asyncio.create_task(self._notify_care_status_change(request, status))

    # Psychologist Visit Requests
    async def create_psychologist_visit_request(self, request_data: PsychologistVisitRequestCreate) -> PsychologistVisitRequest:
        """Create new psychologist visit request and notify admins"""
        request_dict = request_data.dict()
        request_dict['subscriber_id'] = ObjectId(request_data.subscriber_id)
        request_dict['status'] = CareVisitRequestStatus.PENDING
        request_dict['created_at'] = datetime.utcnow()

        result = await self.psych_visits.insert_one(request_dict)

        # Convert ObjectId to string for Pydantic model
        request_dict['_id'] = str(result.inserted_id)
        request_dict['subscriber_id'] = str(request_dict['subscriber_id'])

        # Get subscriber details
        subscriber = await self.users.find_one({"_id": ObjectId(request_data.subscriber_id)})
        
        # Notify all admins - Don't wait for this to complete
        asyncio.create_task(self._notify_admins_new_psych_request(subscriber, request_dict['_id']))

        return PsychologistVisitRequest(**request_dict)

    async def get_all_psychologist_visit_requests(self) -> List[PsychologistVisitRequest]:
        """Get all psychologist visit requests (admin)"""
        cursor = self.psych_visits.find()
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('psychologist_id'):
                request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
            requests.append(PsychologistVisitRequest(**request_doc))
        return requests

    async def get_psychologist_visit_requests_by_subscriber(self, subscriber_id: str) -> List[PsychologistVisitRequest]:
        """Get psychologist visit requests for a specific subscriber"""
        cursor = self.psych_visits.find({"subscriber_id": ObjectId(subscriber_id)})
        requests = []
        async for request_doc in cursor:
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('psychologist_id'):
                request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
            requests.append(PsychologistVisitRequest(**request_doc))
        return requests

    async def get_psychologist_visit_requests_by_psychologist(self, psychologist_id: str) -> List[PsychologistVisitRequest]:
        """Get all psychologist visit requests assigned to a specific psychologist"""
        cursor = self.psych_visits.find({"psychologist_id": ObjectId(psychologist_id)})
        requests = []
        async for request_doc in cursor:
            # Convert ObjectId fields to strings
            request_doc['_id'] = str(request_doc['_id'])
            request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
            if request_doc.get('psychologist_id'):
                request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
            requests.append(PsychologistVisitRequest(**request_doc))
        return requests

    async def get_psychologist_visit_request_by_id(self, request_id: str) -> Optional[PsychologistVisitRequest]:
        """Get a specific psychologist visit request by ID"""
        try:
            request_doc = await self.psych_visits.find_one({"_id": ObjectId(request_id)})
            if request_doc:
                # Convert ObjectId fields to strings
                request_doc['_id'] = str(request_doc['_id'])
                request_doc['subscriber_id'] = str(request_doc['subscriber_id'])
                if request_doc.get('psychologist_id'):
                    request_doc['psychologist_id'] = str(request_doc['psychologist_id'])
                return PsychologistVisitRequest(**request_doc)
            return None
        except Exception as e:
            logger.error(f"Error getting psychologist visit request {request_id}: {str(e)}")
            return None

    async def assign_psychologist(self, request_id: str, psychologist_id: str, appointment_datetime: datetime):
        """Assign psychologist to visit request and notify parties"""
        # Validate ObjectIds first
        if not ObjectId.is_valid(request_id):
            raise ValueError(f"Invalid request ID: {request_id}")
        
        if not ObjectId.is_valid(psychologist_id):
            raise ValueError(f"Invalid psychologist ID: {psychologist_id}")
        
        # Get request details before updating
        request = await self.psych_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            raise ValueError(f"Request not found: {request_id}")
        
        # Update the request
        await self.psych_visits.update_one(
            {"_id": ObjectId(request_id)},
            {
                "$set": {
                    "psychologist_id": ObjectId(psychologist_id),
                    "appointment_date_time": appointment_datetime,
                    "status": CareVisitRequestStatus.ASSIGNED
                }
            }
        )
        
        # Get subscriber and psychologist details
        subscriber = await self.users.find_one({"_id": request['subscriber_id']})
        psychologist = await self.users.find_one({"_id": ObjectId(psychologist_id)})
        
        # Send notifications - Don't wait for this to complete
        asyncio.create_task(self._notify_psych_assignment(subscriber, psychologist, appointment_datetime))

    async def update_psychologist_visit_status(self, request_id: str, status: CareVisitRequestStatus):
        """Update psychologist visit request status and notify if needed"""
        # Get request details
        request = await self.psych_visits.find_one({"_id": ObjectId(request_id)})
        if not request:
            return

        # Update status
        await self.psych_visits.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": status}}
        )

        # Send notifications for important status changes, including IN_PROGRESS
        if status in [
            CareVisitRequestStatus.ACCEPTED, 
            CareVisitRequestStatus.IN_PROGRESS, 
            CareVisitRequestStatus.COMPLETED, 
            CareVisitRequestStatus.CANCELLED
        ]:
            asyncio.create_task(self._notify_psych_status_change(request, status))

    # Notification Methods for Care Visit Requests
    async def _notify_admins_new_care_request(self, subscriber: dict, request_id: str):
        """Notify all admins about new care visit request"""
        try:
            # Get all admin users
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)
            
            if not admins:
                logger.warning("No admin users found to notify")
                return
            
            subscriber_name = subscriber.get('name', 'Unknown') if subscriber else 'Unknown'
            subscriber_phone = subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'
            
            # Email notification content
            subject = "New Care Visit Request - Khayal Healthcare"
            email_body = f"""
Dear Admin,

A new care visit request has been submitted:

Subscriber Details:
- Name: {subscriber_name}
- Phone: {subscriber_phone}
- Request ID: {request_id}

Please log in to the admin portal to review and assign a caretaker.

Best regards,
Khayal Healthcare System
"""
            
            # WhatsApp message content
            whatsapp_message = f"""🔔 *New Care Visit Request*

*Subscriber:* {subscriber_name}
*Phone:* {subscriber_phone}
*Request ID:* {request_id}

Please assign a caretaker through the admin portal.

- Khayal Healthcare"""
            
            # Create notification tasks for all admins
            notification_tasks = []
            
            for admin in admins:
                # Email notification task
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], subject, email_body, f"admin {admin['email']}")
                    )
                
                # WhatsApp notification task
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], whatsapp_message, f"admin {admin['phone']}")
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in admin care request notifications: {str(e)}")

    async def _notify_care_status_change(self, request: dict, new_status: CareVisitRequestStatus):
        """Notify relevant parties about care visit status changes"""
        try:
            # Get subscriber details
            subscriber = await self.users.find_one({"_id": request['subscriber_id']})
            if not subscriber:
                logger.warning(f"Subscriber not found for request {request['_id']}")
                return

            # Get all admins
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)

            # Get caretaker details if assigned
            caretaker = None
            if request.get('caretaker_id'):
                caretaker = await self.users.find_one({"_id": request['caretaker_id']})

            # Define messages per status
            status_messages = {
                CareVisitRequestStatus.ACCEPTED: "Your care visit has been accepted by the caretaker.",
                CareVisitRequestStatus.IN_PROGRESS: "Your care visit session has started.",
                CareVisitRequestStatus.COMPLETED: "Your care visit session has been completed.",
                CareVisitRequestStatus.CANCELLED: "Your care visit appointment has been cancelled."
            }

            message = status_messages.get(new_status, f"Your care visit status: {new_status}")

            # Email content for subscriber
            email_subject = "Care Visit Status Update - Khayal Healthcare"
            email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

{message}

For any queries, please contact support.

Best regards,
Khayal Healthcare
"""

            # WhatsApp content for subscriber
            whatsapp_msg = f"""🔔 *Care Visit Update*

{message}

For any queries, please contact support.

- Khayal Healthcare"""

            # Email content for admins
            admin_subject = f"Care Visit Status Changed - Request {request['_id']}"
            admin_body = f"""
Dear Admin,

The care visit with Request ID {request['_id']} has changed status to: {new_status}.

Subscriber: {subscriber.get('name', 'Unknown')}
Caretaker: {caretaker.get('name', 'Not Assigned') if caretaker else 'Not Assigned'}
            
Please review if any action is needed.

Best regards,
Khayal Healthcare System
"""

            admin_whatsapp_msg = f"""🔔 *Care Visit Status Changed*

Request ID: {request['_id']}
Subscriber: {subscriber.get('name', 'Unknown')}
Caretaker: {caretaker.get('name', 'Not Assigned') if caretaker else 'Not Assigned'}
New Status: {new_status}

Please review accordingly.

- Khayal Healthcare"""

            notification_tasks = []

            # Notify subscriber
            if subscriber.get('email'):
                notification_tasks.append(
                    self._send_email_notification(subscriber['email'], email_subject, email_body, f"subscriber {subscriber['email']}")
                )
            if subscriber.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(subscriber['phone'], whatsapp_msg, f"subscriber {subscriber['phone']}")
                )

            # Notify admins
            for admin in admins:
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], admin_subject, admin_body, f"admin {admin['email']}")
                    )
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], admin_whatsapp_msg, f"admin {admin['phone']}")
                    )

            # Notify caretaker if status is relevant to them
            if caretaker and new_status in [CareVisitRequestStatus.IN_PROGRESS, CareVisitRequestStatus.COMPLETED]:
                caretaker_subject = f"Care Visit Status Update - {new_status}"
                caretaker_body = f"""
Dear {caretaker.get('name', 'Caretaker')},

The care visit for {subscriber.get('name', 'Unknown')} has been marked as: {new_status}.

Thank you for your service.

Best regards,
Khayal Healthcare
"""
                caretaker_whatsapp = f"""🔔 *Care Visit Update*

Patient: {subscriber.get('name', 'Unknown')}
Status: {new_status}

Thank you for your service.

- Khayal Healthcare"""

                if caretaker.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(caretaker['email'], caretaker_subject, caretaker_body, f"caretaker {caretaker['email']}")
                    )
                if caretaker.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(caretaker['phone'], caretaker_whatsapp, f"caretaker {caretaker['phone']}")
                    )

            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in care status change notification: {str(e)}")

    # Notification Methods for Psychology Requests
    async def _notify_admins_new_psych_request(self, subscriber: dict, request_id: str):
        """Notify all admins about new psychology visit request"""
        try:
            # Get all admin users
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)
            
            if not admins:
                logger.warning("No admin users found to notify")
                return
            
            subscriber_name = subscriber.get('name', 'Unknown') if subscriber else 'Unknown'
            subscriber_phone = subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'
            
            # Email notification content
            subject = "New Psychology Visit Request - Khayal Healthcare"
            email_body = f"""
Dear Admin,

A new psychology visit request has been submitted:

Subscriber Details:
- Name: {subscriber_name}
- Phone: {subscriber_phone}
- Request ID: {request_id}

Please log in to the admin portal to review and assign a psychologist.

Best regards,
Khayal Healthcare System
"""
            
            # WhatsApp message content
            whatsapp_message = f"""🔔 *New Psychology Visit Request*

*Subscriber:* {subscriber_name}
*Phone:* {subscriber_phone}
*Request ID:* {request_id}

Please assign a psychologist through the admin portal.

- Khayal Healthcare"""
            
            # Create notification tasks for all admins
            notification_tasks = []
            
            for admin in admins:
                # Email notification task
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], subject, email_body, f"admin {admin['email']}")
                    )
                
                # WhatsApp notification task
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], whatsapp_message, f"admin {admin['phone']}")
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in admin notifications: {str(e)}")

    async def _notify_psych_assignment(self, subscriber: dict, psychologist: dict, appointment_datetime: datetime):
        """Notify psychologist and subscriber about assignment"""
        try:
            formatted_date = appointment_datetime.strftime("%B %d, %Y at %I:%M %p")
            
            notification_tasks = []
            
            # Notify Psychologist
            if psychologist:
                psych_subject = "New Patient Assignment - Khayal Healthcare"
                psych_email_body = f"""
Dear Dr. {psychologist.get('name', 'Doctor')},

You have been assigned a new patient:

Patient Details:
- Name: {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
- Phone: {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
- Appointment: {formatted_date}

Please prepare for the session and contact the patient if needed.

Best regards,
Khayal Healthcare
"""
                
                psych_whatsapp = f"""🔔 *New Patient Assignment*

*Patient:* {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
*Phone:* {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
*Appointment:* {formatted_date}

Please prepare for the session.

- Khayal Healthcare"""
                
                # Add psychologist notification tasks
                if psychologist.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(psychologist['email'], psych_subject, psych_email_body, f"psychologist {psychologist['email']}")
                    )
                
                if psychologist.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(psychologist['phone'], psych_whatsapp, f"psychologist {psychologist['phone']}")
                    )
            
            # Notify Subscriber
            if subscriber:
                sub_subject = "Psychology Appointment Confirmed - Khayal Healthcare"
                sub_email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

Your psychology appointment has been confirmed:

Psychologist: Dr. {psychologist.get('name', 'Unknown') if psychologist else 'Unknown'}
Date & Time: {formatted_date}

The psychologist will contact you shortly. Please be available at the scheduled time.

Best regards,
Khayal Healthcare
"""
                
                sub_whatsapp = f"""✔️ *Appointment Confirmed*

*Psychologist:* Dr. {psychologist.get('name', 'Unknown') if psychologist else 'Unknown'}
*Date & Time:* {formatted_date}

Please be available at the scheduled time.

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
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in assignment notifications: {str(e)}")

    async def _notify_caretaker_assignment(self, subscriber: dict, caretaker: dict, appointment_datetime: datetime):
        """Notify caretaker and subscriber about assignment"""
        try:
            formatted_date = appointment_datetime.strftime("%B %d, %Y at %I:%M %p")
            
            notification_tasks = []
            
            # Notify Caretaker
            if caretaker:
                caretaker_subject = "New Patient Assignment - Khayal Healthcare"
                caretaker_email_body = f"""
Dear {caretaker.get('name', 'Caretaker')},

You have been assigned a new patient:

Patient Details:
- Name: {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
- Phone: {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
- Address: {subscriber.get('address', 'Not provided') if subscriber else 'Not provided'}
- City: {subscriber.get('city', 'Not provided') if subscriber else 'Not provided'}
- Appointment: {formatted_date}

Please prepare for the visit and contact the patient if needed.

Best regards,
Khayal Healthcare
"""
                
                caretaker_whatsapp = f"""🔔 *New Patient Assignment*

*Patient:* {subscriber.get('name', 'Unknown') if subscriber else 'Unknown'}
*Phone:* {subscriber.get('phone', 'Unknown') if subscriber else 'Unknown'}
*Address:* {subscriber.get('address', 'Not provided') if subscriber else 'Not provided'}
*Appointment:* {formatted_date}

Please prepare for the visit.

- Khayal Healthcare"""
                
                # Add caretaker notification tasks
                if caretaker.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(caretaker['email'], caretaker_subject, caretaker_email_body, f"caretaker {caretaker['email']}")
                    )
                
                if caretaker.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(caretaker['phone'], caretaker_whatsapp, f"caretaker {caretaker['phone']}")
                    )
            
            # Notify Subscriber
            if subscriber:
                sub_subject = "Care Visit Appointment Confirmed - Khayal Healthcare"
                sub_email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

Your care visit appointment has been confirmed:

Caretaker: {caretaker.get('name', 'Unknown') if caretaker else 'Unknown'}
Date & Time: {formatted_date}

The caretaker will contact you shortly. Please be available at the scheduled time.

Best regards,
Khayal Healthcare
"""
                
                sub_whatsapp = f"""✔️ *Care Visit Confirmed*

*Caretaker:* {caretaker.get('name', 'Unknown') if caretaker else 'Unknown'}
*Date & Time:* {formatted_date}

Please be available at the scheduled time.

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
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in caretaker assignment notifications: {str(e)}")

    async def _notify_psych_status_change(self, request: dict, new_status: CareVisitRequestStatus):
        """Notify relevant parties about psychology status changes"""
        try:
            # Get subscriber details
            subscriber = await self.users.find_one({"_id": request['subscriber_id']})
            if not subscriber:
                logger.warning(f"Subscriber not found for request {request['_id']}")
                return

            # Get all admins
            admin_cursor = self.users.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)

            # Get psychologist details if assigned
            psychologist = None
            if request.get('psychologist_id'):
                psychologist = await self.users.find_one({"_id": request['psychologist_id']})

            # Define messages per status
            status_messages = {
                CareVisitRequestStatus.ACCEPTED: "Your appointment has been accepted by the psychologist.",
                CareVisitRequestStatus.IN_PROGRESS: "Your psychology session has started.",
                CareVisitRequestStatus.COMPLETED: "Your psychology session has been completed.",
                CareVisitRequestStatus.CANCELLED: "Your psychology appointment has been cancelled."
            }

            message = status_messages.get(new_status, f"Your appointment status: {new_status}")

            # Email content for subscriber
            email_subject = "Appointment Status Update - Khayal Healthcare"
            email_body = f"""
Dear {subscriber.get('name', 'Valued Customer')},

{message}

For any queries, please contact support.

Best regards,
Khayal Healthcare
"""

            # WhatsApp content for subscriber
            whatsapp_msg = f"""🔔 *Appointment Update*

{message}

For any queries, please contact support.

- Khayal Healthcare"""

            # Email content for admins
            admin_subject = f"Psychology Appointment Status Changed - Request {request['_id']}"
            admin_body = f"""
Dear Admin,

The psychology appointment with Request ID {request['_id']} has changed status to: {new_status}.

Subscriber: {subscriber.get('name', 'Unknown')}
Psychologist: {psychologist.get('name', 'Not Assigned') if psychologist else 'Not Assigned'}
            
Please review if any action is needed.

Best regards,
Khayal Healthcare System
"""

            admin_whatsapp_msg = f"""🔔 *Appointment Status Changed*

Request ID: {request['_id']}
Subscriber: {subscriber.get('name', 'Unknown')}
Psychologist: {psychologist.get('name', 'Not Assigned') if psychologist else 'Not Assigned'}
New Status: {new_status}

Please review accordingly.

- Khayal Healthcare"""

            notification_tasks = []

            # Notify subscriber
            if subscriber.get('email'):
                notification_tasks.append(
                    self._send_email_notification(subscriber['email'], email_subject, email_body, f"subscriber {subscriber['email']}")
                )
            if subscriber.get('phone'):
                notification_tasks.append(
                    self._send_whatsapp_notification(subscriber['phone'], whatsapp_msg, f"subscriber {subscriber['phone']}")
                )

            # Notify admins
            for admin in admins:
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(admin['email'], admin_subject, admin_body, f"admin {admin['email']}")
                    )
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(admin['phone'], admin_whatsapp_msg, f"admin {admin['phone']}")
                    )

            # Notify psychologist if status is relevant to them
            if psychologist and new_status in [CareVisitRequestStatus.IN_PROGRESS, CareVisitRequestStatus.COMPLETED]:
                psych_subject = f"Session Status Update - {new_status}"
                psych_body = f"""
Dear Dr. {psychologist.get('name', 'Doctor')},

The session for {subscriber.get('name', 'Unknown')} has been marked as: {new_status}.

Thank you for your service.

Best regards,
Khayal Healthcare
"""
                psych_whatsapp = f"""🔔 *Session Update*

Patient: {subscriber.get('name', 'Unknown')}
Status: {new_status}

Thank you for your service.

- Khayal Healthcare"""

                if psychologist.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(psychologist['email'], psych_subject, psych_body, f"psychologist {psychologist['email']}")
                    )
                if psychologist.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(psychologist['phone'], psych_whatsapp, f"psychologist {psychologist['phone']}")
                    )

            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"Error in psychology status change notification: {str(e)}")

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
