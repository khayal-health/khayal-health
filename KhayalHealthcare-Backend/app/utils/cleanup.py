import asyncio
from datetime import datetime, timedelta, date
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

async def cleanup_expired_verifications(db: AsyncIOMotorDatabase):
    """Clean up expired verification codes and old daily attempt records periodically"""
    while True:
        try:
            # Delete expired verification codes
            result = await db.verification_codes.delete_many({
                "status": "pending",
                "expires_at": {"$lt": datetime.utcnow()}
            })
            
            if result.deleted_count > 0:
                logger.info(f"Cleaned up {result.deleted_count} expired verification codes")
            
            # Clean up daily attempt records older than 1 day
            yesterday = date.today() - timedelta(days=1)
            result2 = await db.daily_verification_attempts.delete_many({
                "attempt_date": {"$lt": yesterday}
            })
            
            if result2.deleted_count > 0:
                logger.info(f"Cleaned up {result2.deleted_count} old daily attempt records")
            
            # Wait for 1 hour before next cleanup
            await asyncio.sleep(3600)
            
        except Exception as e:
            logger.error(f"Error in cleanup task: {str(e)}")
            await asyncio.sleep(3600)
