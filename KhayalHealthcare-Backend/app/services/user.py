from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus, SubscriptionStatus
from app.schemas.user import UserCreate, UserUpdate
from app.utils.auth import get_password_hash
from datetime import datetime
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users

    async def create_user(self, user_data: UserCreate, email_verified: bool = False, phone_verified: bool = False) -> User:
        """Create a new user and notify admins"""
        # Check if username already exists
        existing_user = await self.get_user_by_username(user_data.username)
        if existing_user:
            raise ValueError(f"Username '{user_data.username}' is already taken")
        
        # Check if email already exists
        existing_email = await self.get_user_by_email(user_data.email)
        if existing_email:
            raise ValueError(f"Email '{user_data.email}' is already registered")
    
        # Hash password
        hashed_password = get_password_hash(user_data.password)
    
        # Create user document
        user_dict = user_data.dict()
        user_dict['password'] = hashed_password
        user_dict['approval_status'] = ApprovalStatus.PENDING
        user_dict['created_at'] = datetime.utcnow()
        user_dict['updated_at'] = datetime.utcnow()
        
        # Add verification status
        user_dict['email_verified'] = email_verified
        user_dict['phone_verified'] = phone_verified
        if email_verified and phone_verified:
            user_dict['verified_at'] = datetime.utcnow()
    
        # Add default values for subscribers
        if user_data.role == UserRole.SUBSCRIBER:
            if not user_dict.get('address'):
                user_dict['address'] = "Default Address"
            if not user_dict.get('city'):
                user_dict['city'] = "Default City"
    
        # Pad phone number if needed
        if len(user_dict['phone']) < 10:
            user_dict['phone'] = user_dict['phone'].ljust(10, '0')
    
        result = await self.collection.insert_one(user_dict)
    
        # Convert ObjectId to string for Pydantic model
        user_dict['_id'] = str(result.inserted_id)
        
        # Create User object
        new_user = User(**user_dict)
        
        # Only notify if verified
        if email_verified and phone_verified:
            # Notify admins about new registration
            asyncio.create_task(self._notify_admins_new_registration(new_user))
            
            # Notify user about profile submission
            asyncio.create_task(self._notify_user_profile_submitted(new_user))
    
        return new_user

    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        user_doc = await self.collection.find_one({"email": email})
        if user_doc:
            user_doc['_id'] = str(user_doc['_id'])
            return User(**user_doc)
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user_doc = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user_doc:
                user_doc['_id'] = str(user_doc['_id'])
                return User(**user_doc)
            return None
        except:
            return None

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        user_doc = await self.collection.find_one({"username": username})
        if user_doc:
            user_doc['_id'] = str(user_doc['_id'])
            return User(**user_doc)
        return None

    async def get_users_by_role(self, role: str) -> List[User]:
        """Get all users by role"""
        cursor = self.collection.find({"role": role})
        users = []
        async for user_doc in cursor:
            user_doc['_id'] = str(user_doc['_id']) 
            users.append(User(**user_doc))
        return users

    async def update_user_approval_status(self, user_id: str, status: ApprovalStatus):
        """Update user approval status and notify user if approved"""
        # Get user details before updating
        user = await self.get_user_by_id(user_id)
        if not user:
            logger.error(f"User not found for approval update: {user_id}")
            return
            
        # Update status
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"approval_status": status, "updated_at": datetime.utcnow()}}
        )
        
        # Notify user if approved or rejected
        if status in [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]:
            asyncio.create_task(self._notify_user_approval_status(user, status))

    async def get_subscribers_summary(self) -> List[dict]:
        """Get subscribers with basic info"""
        cursor = self.collection.find(
            {"role": UserRole.SUBSCRIBER},
            {"_id": 1, "name": 1}
        )
        subscribers = []
        async for user_doc in cursor:
            subscribers.append({
                "id": str(user_doc["_id"]),
                "name": user_doc["name"]
            })
        return subscribers
    
    async def update_chef_availability(self, user_id: str, available: bool) -> Optional[User]:
        """Update chef availability"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id), "role": UserRole.CHEF},
                {
                    "$set": {
                        "available": available,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                return await self.get_user_by_id(user_id)
            return None
        except Exception as e:
            return None
        
    async def update_user_subscription(
        self,
        user_id: str,
        status: SubscriptionStatus,
        plans: List[str],
        expiry_date: datetime,
        renewal_date: Optional[datetime] = None
    ):
        """Update user subscription"""
        update_data = {
            "subscription_status": status,
            "subscription_plans": plans,
            "subscription_expiry": expiry_date,
            "updated_at": datetime.utcnow()
        }

        update_data["subscription_renewal_date"] = renewal_date or expiry_date

        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

    async def get_user_by_username_case_insensitive(self, username: str) -> Optional[User]:
        """Get user by username (case-insensitive)"""
        try:
            # Create case-insensitive regex pattern
            user_doc = await self.collection.find_one({
                "username": {"$regex": f"^{username}$", "$options": "i"}
            })
            if user_doc:
                user_doc['_id'] = str(user_doc['_id'])
                return User(**user_doc)
            return None
        except Exception as e:
            raise

    # Notification methods
    async def _notify_admins_new_registration(self, new_user: User):
        """Notify all admins about new user registration"""
        try:
            # Get all admin users
            admin_cursor = self.collection.find({"role": UserRole.ADMIN})
            admins = await admin_cursor.to_list(None)
            
            if not admins:
                logger.warning("No admin users found to notify")
                return
            
            # Email notification content
            subject = f"New {new_user.role.value.title()} Registration - Khayal Healthcare"
            email_body = f"""
Dear Admin,

A new {new_user.role.value} has registered on Khayal Healthcare:

User Details:
- Name: {new_user.name}
- Username: {new_user.username}
- Email: {new_user.email}
- Phone: {new_user.phone}
- Role: {new_user.role.value}
"""
            
            # Add role-specific details
            if new_user.role == UserRole.SUBSCRIBER:
                email_body += f"""
- Age: {new_user.age or 'Not provided'}
- City: {new_user.city}
- Previous Illness: {new_user.previous_illness or 'None'}
"""
            elif new_user.role in [UserRole.CHEF, UserRole.CARETAKER, UserRole.PSYCHOLOGIST]:
                email_body += f"""
- Experience: {new_user.experience or 'Not provided'} years
- Degree/Certification: {new_user.degree or 'Not provided'}
"""
                
            email_body += """

Please log in to the admin portal to review and approve/reject this registration.

Best regards,
Khayal Healthcare System
"""
            
            # WhatsApp message content
            whatsapp_message = f"""🔔 *New {new_user.role.value.title()} Registration*

*Name:* {new_user.name}
*Username:* {new_user.username}
*Email:* {new_user.email}
*Phone:* {new_user.phone}
*Role:* {new_user.role.value}

Please review and approve/reject through the admin portal.

- Khayal Healthcare"""
            
            # Create notification tasks for all admins
            notification_tasks = []
            
            for admin in admins:
                # Email notification task
                if admin.get('email'):
                    notification_tasks.append(
                        self._send_email_notification(
                            admin['email'], 
                            subject, 
                            email_body, 
                            f"admin {admin.get('name', admin['email'])}"
                        )
                    )
                
                # WhatsApp notification task
                if admin.get('phone'):
                    notification_tasks.append(
                        self._send_whatsapp_notification(
                            admin['phone'], 
                            whatsapp_message, 
                            f"admin {admin.get('name', admin['phone'])}"
                        )
                    )
            
            # Execute all notification tasks concurrently
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                        
        except Exception as e:
            logger.error(f"Error in admin registration notifications: {str(e)}")

    async def _notify_user_profile_submitted(self, user: User):
        """Notify user that their profile has been submitted for review"""
        try:
            # Email content
            subject = "Registration Submitted - Khayal Healthcare"
            email_body = f"""
Dear {user.name},

Thank you for registering with Khayal Healthcare!

Your profile has been successfully submitted and is currently under review by our admin team. We will notify you once your account has been approved.

Your Registration Details:
- Username: {user.username}
- Email: {user.email}
- Role: {user.role.value.title()}

This review process typically takes 24-48 hours. You will receive a notification via email and WhatsApp once your account status is updated.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
Khayal Healthcare Team
"""
            
            # WhatsApp message
            whatsapp_message = f"""👋 Welcome to Khayal Healthcare!

Dear {user.name},

Your registration has been submitted successfully! ✅

*Status:* Under Review 🔍
*Username:* {user.username}
*Role:* {user.role.value.title()}

We'll notify you once your account is approved (usually within 24-48 hours).

Thank you for choosing Khayal Healthcare!

- Khayal Healthcare Team"""
            
            notification_tasks = []
            
            # Send email notification
            if user.email:
                notification_tasks.append(
                    self._send_email_notification(
                        user.email, 
                        subject, 
                        email_body, 
                        f"user {user.name}"
                    )
                )
            
            # Send WhatsApp notification
            if user.phone:
                notification_tasks.append(
                    self._send_whatsapp_notification(
                        user.phone, 
                        whatsapp_message, 
                        f"user {user.name}"
                    )
                )
            
            # Execute notifications
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                
        except Exception as e:
            logger.error(f"Error notifying user about profile submission: {str(e)}")

    async def _notify_user_approval_status(self, user: User, status: ApprovalStatus):
        """Notify user about their approval status"""
        try:
            if status == ApprovalStatus.APPROVED:
                # Approval email
                subject = "Account Approved - Welcome to Khayal Healthcare!"
                email_body = f"""
Dear {user.name},

Great news! Your account has been approved! 🎉

You can now log in to Khayal Healthcare using your credentials:
- Username: {user.username}
- Role: {user.role.value.title()}

What's next?
- Log in to your dashboard
- Complete your profile if needed
- Start using our services

If you have any questions or need assistance, our support team is here to help.

Welcome to the Khayal Healthcare family!

Best regards,
Khayal Healthcare Team
"""
                
                # Approval WhatsApp
                whatsapp_message = f"""🎉 *Congratulations {user.name}!*

Your Khayal Healthcare account has been *APPROVED!* ✅

*Username:* {user.username}
*Role:* {user.role.value.title()}

You can now log in and start using our services.

Welcome to Khayal Healthcare! 🏥

- Khayal Healthcare Team"""
                
            else:  # REJECTED
                # Rejection email
                subject = "Account Review Update - Khayal Healthcare"
                email_body = f"""
Dear {user.name},

Thank you for your interest in Khayal Healthcare.

After reviewing your application, we regret to inform you that we are unable to approve your account at this time.

If you believe this decision was made in error or would like to provide additional information, please contact our support team at support@khayalhealthcare.com.

We appreciate your understanding.

Best regards,
Khayal Healthcare Team
"""
                
                # Rejection WhatsApp
                whatsapp_message = f"""Dear {user.name},

Your Khayal Healthcare account application status: *Not Approved* ❌

For more information or to appeal this decision, please contact our support team.

Thank you for your understanding.

- Khayal Healthcare Team"""
            
            notification_tasks = []
            
            # Send email notification
            if user.email:
                notification_tasks.append(
                    self._send_email_notification(
                        user.email, 
                        subject, 
                        email_body, 
                        f"user {user.name}"
                    )
                )
            
            # Send WhatsApp notification
            if user.phone:
                notification_tasks.append(
                    self._send_whatsapp_notification(
                        user.phone, 
                        whatsapp_message, 
                        f"user {user.name}"
                    )
                )
            
            # Execute notifications
            if notification_tasks:
                await asyncio.gather(*notification_tasks, return_exceptions=True)
                
        except Exception as e:
            logger.error(f"Error notifying user about approval status: {str(e)}")

    # Helper methods for notifications
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


    async def update_user_password(self, user_id: str, new_hashed_password: str) -> bool:
        """Update user password"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "password": new_hashed_password,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating password for user {user_id}: {str(e)}")
            return False