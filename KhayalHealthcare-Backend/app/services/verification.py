import random
import string
from typing import Optional, Tuple
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.verification import (
    VerificationCode, VerificationType, VerificationMethod, 
    VerificationStatus, AccountRestriction
)
from app.models.user import User
from app.schemas.verification import VerificationCodeCreate
from app.services.notification import send_email_async, send_whatsapp_async
import logging
import asyncio

logger = logging.getLogger(__name__)

class VerificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.verifications = db.verification_codes
        self.restrictions = db.account_restrictions
        self.users = db.users
        
        # Configuration
        self.CODE_LENGTH = 6
        self.CODE_EXPIRY_MINUTES = 10
        self.RESEND_COOLDOWN_MINUTES = 5
        self.MAX_RESEND_ATTEMPTS = 3
        self.RESTRICTION_DAYS = 4
    
    def generate_code(self) -> str:
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=self.CODE_LENGTH))
    
    async def check_restrictions(self, email: str, phone: str) -> Tuple[bool, Optional[str]]:
        """Check if the email/phone is restricted"""
        now = datetime.utcnow()
        
        # Check for active restrictions
        restriction = await self.restrictions.find_one({
            "$or": [{"email": email}, {"phone": phone}],
            "restricted_until": {"$gt": now}
        })
        
        if restriction:
            restricted_until = restriction['restricted_until']
            days_left = (restricted_until - now).days
            return False, f"Account restricted for {days_left} more days due to excessive attempts"
        
        return True, None
    
    async def create_verification_code(
        self, 
        data: VerificationCodeCreate,
        user_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[VerificationCode]]:
        """Create and send verification code"""
        try:
            # Check restrictions
            is_allowed, restriction_msg = await self.check_restrictions(data.email, data.phone)
            if not is_allowed:
                return False, restriction_msg, None
            
            # Check for existing pending verification
            existing = await self.verifications.find_one({
                "email": data.email,
                "phone": data.phone,
                "type": data.type,
                "status": VerificationStatus.PENDING,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            if existing:
                # Check if can resend
                last_sent = existing.get('last_sent_at', existing.get('created_at'))
                time_since_last = datetime.utcnow() - last_sent
                
                if time_since_last < timedelta(minutes=self.RESEND_COOLDOWN_MINUTES):
                    minutes_left = self.RESEND_COOLDOWN_MINUTES - int(time_since_last.total_seconds() / 60)
                    return False, f"Please wait {minutes_left} minutes before requesting a new code", None
                
                # Check resend attempts
                if existing.get('resend_count', 0) >= self.MAX_RESEND_ATTEMPTS:
                    # Create restriction
                    await self._create_restriction(data.email, data.phone, "Exceeded maximum verification attempts")
                    return False, f"Maximum attempts exceeded. Account restricted for {self.RESTRICTION_DAYS} days", None
            
            # Generate new code
            code = self.generate_code()
            expires_at = datetime.utcnow() + timedelta(minutes=self.CODE_EXPIRY_MINUTES)
            
            # Create verification record
            verification_dict = {
                "email": data.email,
                "phone": data.phone,
                "username": data.username,
                "code": code,
                "type": data.type,
                "method": data.method,
                "status": VerificationStatus.PENDING,
                "attempts": 0,
                "last_sent_at": datetime.utcnow(),
                "expires_at": expires_at,
                "created_at": datetime.utcnow(),
                "resend_count": existing.get('resend_count', 0) + 1 if existing else 0,
                "last_resend_at": datetime.utcnow() if existing else None,
                "registration_data": data.registration_data
            }
            
            if user_id:
                verification_dict["user_id"] = ObjectId(user_id)
            
            # Update or insert
            if existing:
                await self.verifications.update_one(
                    {"_id": existing['_id']},
                    {"$set": verification_dict}
                )
                verification_dict['_id'] = existing['_id']
            else:
                result = await self.verifications.insert_one(verification_dict)
                verification_dict['_id'] = result.inserted_id
            
            # Send verification code
            successful_methods = await self._send_verification_code(data.email, data.phone, code, data.type, data.method)

            # Convert to model
            verification_dict['_id'] = str(verification_dict['_id'])
            if verification_dict.get('user_id'):
                verification_dict['user_id'] = str(verification_dict['user_id'])

            # Provide feedback about which methods succeeded
            if successful_methods:
                message = f"Verification code sent successfully via {', '.join(successful_methods)}"
            else:
                message = "Verification code created. Please check your email and WhatsApp."

            return True, message, VerificationCode(**verification_dict)
            
        except Exception as e:
            logger.error(f"Error creating verification code: {str(e)}")
            return False, "Failed to send verification code", None
    
    async def verify_code(
        self, 
        email: str, 
        phone: str, 
        code: str, 
        type: VerificationType
    ) -> Tuple[bool, str, Optional[dict]]:
        """Verify the code"""
        try:
            # Find the verification record
            verification = await self.verifications.find_one({
                "email": email,
                "phone": phone,
                "type": type,
                "status": VerificationStatus.PENDING
            })
            
            if not verification:
                return False, "No pending verification found", None
            
            # Check expiry
            if datetime.utcnow() > verification['expires_at']:
                await self.verifications.update_one(
                    {"_id": verification['_id']},
                    {"$set": {"status": VerificationStatus.EXPIRED}}
                )
                return False, "Verification code has expired", None
            
            # Increment attempts
            attempts = verification.get('attempts', 0) + 1
            await self.verifications.update_one(
                {"_id": verification['_id']},
                {"$inc": {"attempts": 1}}
            )
            
            # Check code
            if verification['code'] != code:
                if attempts >= 5:
                    await self._create_restriction(email, phone, "Too many incorrect verification attempts")
                    return False, "Too many incorrect attempts. Account restricted", None
                return False, f"Invalid code. {5 - attempts} attempts remaining", None
            
            # Mark as verified
            await self.verifications.update_one(
                {"_id": verification['_id']},
                {"$set": {
                    "status": VerificationStatus.VERIFIED,
                    "verified_at": datetime.utcnow()
                }}
            )
            
            # Return registration data if available
            return True, "Code verified successfully", verification.get('registration_data')
            
        except Exception as e:
            logger.error(f"Error verifying code: {str(e)}")
            return False, "Verification failed", None
    
    async def resend_code(self, email: str, phone: str, type: VerificationType) -> Tuple[bool, str]:
        """Resend verification code"""
        data = VerificationCodeCreate(
            email=email,
            phone=phone,
            type=type,
            method=VerificationMethod.BOTH
        )
        
        success, message, _ = await self.create_verification_code(data)
        return success, message
    
    async def _create_restriction(self, email: str, phone: str, reason: str):
        """Create account restriction"""
        restriction = {
            "email": email,
            "phone": phone,
            "restriction_type": "excessive_attempts",
            "restricted_until": datetime.utcnow() + timedelta(days=self.RESTRICTION_DAYS),
            "reason": reason,
            "created_at": datetime.utcnow()
        }
        
        await self.restrictions.insert_one(restriction)
    
    async def _send_verification_code(
        self,
        email: str,
        phone: str,
        code: str,
        type: VerificationType,
        method: VerificationMethod
    ) -> list:
        """Send verification code via email and/or WhatsApp"""
        tasks = []
        
        if type == VerificationType.REGISTRATION:
            subject = "Verify Your Khayal Healthcare Account"
            email_body = f"""
Dear User,

Welcome to Khayal Healthcare! To complete your registration, please use the following verification code:

Verification Code: {code}

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

If you didn't request this code, please ignore this email.

Best regards,
Khayal Healthcare Team
"""
            
            whatsapp_message = f"""🔐 *Khayal Healthcare Verification*

Your verification code is: *{code}*

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

Don't share this code with anyone.

- Khayal Healthcare"""
            
        else:  # Password Reset
            subject = "Reset Your Khayal Healthcare Password"
            email_body = f"""
Dear User,

You requested to reset your password. Use this verification code:

Verification Code: {code}

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Khayal Healthcare Team
"""
            
            whatsapp_message = f"""🔐 *Password Reset Request*

Your verification code is: *{code}*

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.

If you didn't request this, please ignore this message.

- Khayal Healthcare"""
        
        # Fire-and-forget sending; do not await to avoid delaying the request
        scheduled_methods = []
        if method in [VerificationMethod.EMAIL, VerificationMethod.BOTH]:
            asyncio.create_task(self._send_email_async(email, subject, email_body))
            scheduled_methods.append("email")
        if method in [VerificationMethod.WHATSAPP, VerificationMethod.BOTH]:
            asyncio.create_task(self._send_whatsapp_async(phone, whatsapp_message))
            scheduled_methods.append("WhatsApp")
        if scheduled_methods:
            logger.info(f"Queued verification notifications via: {', '.join(scheduled_methods)}")
        else:
            logger.info("No verification notification methods selected")
        return scheduled_methods

    async def _send_email_async(self, email: str, subject: str, body: str):
        try:
            ok = await send_email_async(email, subject, body, timeout=3.0)
            if ok:
                logger.info(f"Verification email sent to {email}")
            else:
                logger.warning(f"Verification email failed for {email}")
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {str(e)}")

    async def _send_whatsapp_async(self, phone: str, message: str):
        try:
            ok = await send_whatsapp_async(phone, message, timeout=3.0)
            if ok:
                logger.info(f"Verification WhatsApp sent to {phone}")
            else:
                logger.warning(f"Verification WhatsApp failed for {phone}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {phone}: {str(e)}")

    async def _send_email_with_timeout(self, email: str, subject: str, body: str):
        """Send email with timeout"""
        try:
            await asyncio.wait_for(
                self._send_email_async(email, subject, body),
                timeout=10.0
            )
            return True
        except asyncio.TimeoutError:
            logger.warning(f"Email sending to {email} timed out after 10 seconds")
            return False
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {str(e)}")
            return False

    async def _send_whatsapp_with_timeout(self, phone: str, message: str):
        """Send WhatsApp with timeout"""
        try:
            await asyncio.wait_for(
                self._send_whatsapp_async(phone, message),
                timeout=10.0
            )
            return True
        except asyncio.TimeoutError:
            logger.warning(f"WhatsApp sending to {phone} timed out after 10 seconds")
            return False
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {phone}: {str(e)}")
            return False
    
    async def cleanup_expired_codes(self):
        """Clean up expired verification codes"""
        await self.verifications.delete_many({
            "status": VerificationStatus.PENDING,
            "expires_at": {"$lt": datetime.utcnow()}
        })
