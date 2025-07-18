import random
import string
from typing import Optional, Tuple
from datetime import datetime, timedelta, date
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.verification import (
    VerificationCode, VerificationType, VerificationMethod, 
    VerificationStatus, DailyVerificationAttempt
)
from app.models.user import User
from app.schemas.verification import VerificationCodeCreate
from app.services.notification import send_notification, send_message
import logging
import asyncio

logger = logging.getLogger(__name__)

class VerificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.verifications = db.verification_codes
        self.daily_attempts = db.daily_verification_attempts
        self.users = db.users
        
        # Configuration
        self.CODE_LENGTH = 6
        self.CODE_EXPIRY_MINUTES = 10
        self.RESEND_COOLDOWN_MINUTES = 2  # Reduced from 5 to 2 minutes
        self.MAX_DAILY_ATTEMPTS = 5  # Maximum attempts per day
        self.MAX_WRONG_CODE_ATTEMPTS = 5  # Maximum wrong code attempts per verification
    
    def generate_code(self) -> str:
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=self.CODE_LENGTH))
    
    async def check_daily_limit(self, email: str, phone: str, type: VerificationType) -> Tuple[bool, Optional[str], int]:
        """Check if the user has exceeded daily limit"""
        today = date.today()
        
        # Find today's attempt record
        attempt_record = await self.daily_attempts.find_one({
            "email": email,
            "phone": phone,
            "type": type,
            "attempt_date": today
        })
        
        if not attempt_record:
            # No attempts today, create new record
            await self.daily_attempts.insert_one({
                "email": email,
                "phone": phone,
                "type": type,
                "attempt_date": today,
                "attempt_count": 1,
                "last_attempt_at": datetime.utcnow()
            })
            return True, None, 1
        
        # Check if limit exceeded
        if attempt_record['attempt_count'] >= self.MAX_DAILY_ATTEMPTS:
            remaining_hours = 24 - (datetime.utcnow() - datetime.combine(today, datetime.min.time())).total_seconds() / 3600
            return False, f"Daily limit of {self.MAX_DAILY_ATTEMPTS} attempts exceeded. Try again in {int(remaining_hours)} hours.", attempt_record['attempt_count']
        
        # Increment attempt count
        await self.daily_attempts.update_one(
            {"_id": attempt_record['_id']},
            {
                "$inc": {"attempt_count": 1},
                "$set": {"last_attempt_at": datetime.utcnow()}
            }
        )
        
        return True, None, attempt_record['attempt_count'] + 1
    
    async def create_verification_code(
        self, 
        data: VerificationCodeCreate,
        user_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[VerificationCode]]:
        """Create and send verification code"""
        try:
            # Check daily limit
            is_allowed, limit_msg, attempt_number = await self.check_daily_limit(
                data.email, data.phone, data.type
            )
            if not is_allowed:
                return False, limit_msg, None
            
            # Check for existing pending verification
            existing = await self.verifications.find_one({
                "email": data.email,
                "phone": data.phone,
                "type": data.type,
                "status": VerificationStatus.PENDING,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            if existing:
                # Check cooldown period
                last_sent = existing.get('last_sent_at', existing.get('created_at'))
                time_since_last = datetime.utcnow() - last_sent
                
                if time_since_last < timedelta(minutes=self.RESEND_COOLDOWN_MINUTES):
                    minutes_left = self.RESEND_COOLDOWN_MINUTES - int(time_since_last.total_seconds() / 60)
                    return False, f"Please wait {minutes_left} minutes before requesting a new code", None
            
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
            await self._send_verification_code(
                data.email, 
                data.phone, 
                code, 
                data.type, 
                data.method,
                attempt_number,
                self.MAX_DAILY_ATTEMPTS - attempt_number
            )
            
            # Convert to model
            verification_dict['_id'] = str(verification_dict['_id'])
            if verification_dict.get('user_id'):
                verification_dict['user_id'] = str(verification_dict['user_id'])
            
            attempts_remaining = self.MAX_DAILY_ATTEMPTS - attempt_number
            message = f"Verification code sent successfully. You have {attempts_remaining} attempts remaining today."
            
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
                return False, "Verification code has expired. Please request a new one.", None
            
            # Increment attempts
            attempts = verification.get('attempts', 0) + 1
            await self.verifications.update_one(
                {"_id": verification['_id']},
                {"$inc": {"attempts": 1}}
            )
            
            # Check code
            if verification['code'] != code:
                remaining_attempts = self.MAX_WRONG_CODE_ATTEMPTS - attempts
                if attempts >= self.MAX_WRONG_CODE_ATTEMPTS:
                    # Mark as expired after max wrong attempts
                    await self.verifications.update_one(
                        {"_id": verification['_id']},
                        {"$set": {"status": VerificationStatus.EXPIRED}}
                    )
                    return False, "Too many incorrect attempts. Please request a new code.", None
                return False, f"Invalid code. {remaining_attempts} attempts remaining.", None
            
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
    
    async def _send_verification_code(
        self, 
        email: str, 
        phone: str, 
        code: str, 
        type: VerificationType,
        method: VerificationMethod,
        attempt_number: int,
        attempts_remaining: int
    ):
        """Send verification code via email and/or WhatsApp"""
        tasks = []
        
        if type == VerificationType.REGISTRATION:
            subject = "Verify Your Khayal Healthcare Account"
            email_body = f"""
Dear User,

Welcome to Khayal Healthcare! To complete your registration, please use the following verification code:

Verification Code: {code}

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.
Daily attempts remaining: {attempts_remaining}

If you didn't request this code, please ignore this email.

Best regards,
Khayal Healthcare Team
"""
            
            whatsapp_message = f"""🔐 *Khayal Healthcare Verification*

Your verification code is: *{code}*

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.
Daily attempts remaining: {attempts_remaining}

Don't share this code with anyone.

- Khayal Healthcare"""
            
        else:  # Password Reset
            subject = "Reset Your Khayal Healthcare Password"
            email_body = f"""
Dear User,

You requested to reset your password. Use this verification code:

Verification Code: {code}

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.
Daily attempts remaining: {attempts_remaining}

If you didn't request this, please ignore this email and your password will remain unchanged.

Best regards,
Khayal Healthcare Team
"""
            
            whatsapp_message = f"""🔐 *Password Reset Request*

Your verification code is: *{code}*

This code will expire in {self.CODE_EXPIRY_MINUTES} minutes.
Daily attempts remaining: {attempts_remaining}

If you didn't request this, please ignore this message.

- Khayal Healthcare"""
        
        # Send based on method
        if method in [VerificationMethod.EMAIL, VerificationMethod.BOTH]:
            tasks.append(
                self._send_email_async(email, subject, email_body)
            )
        
        if method in [VerificationMethod.WHATSAPP, VerificationMethod.BOTH]:
            tasks.append(
                self._send_whatsapp_async(phone, whatsapp_message)
            )
        
        # Execute all tasks
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_email_async(self, email: str, subject: str, body: str):
        """Send email asynchronously"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_notification, email, subject, body
            )
            logger.info(f"Verification email sent to {email}")
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {str(e)}")
    
    async def _send_whatsapp_async(self, phone: str, message: str):
        """Send WhatsApp message asynchronously"""
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, send_message, phone, message
            )
            logger.info(f"Verification WhatsApp sent to {phone}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to {phone}: {str(e)}")
    
    async def cleanup_expired_codes(self):
        """Clean up expired verification codes and old daily attempt records"""
        # Clean up expired verification codes
        await self.verifications.delete_many({
            "status": VerificationStatus.PENDING,
            "expires_at": {"$lt": datetime.utcnow()}
        })
        
        # Clean up daily attempt records older than 1 day
        yesterday = date.today() - timedelta(days=1)
        await self.daily_attempts.delete_many({
            "attempt_date": {"$lt": yesterday}
        })
