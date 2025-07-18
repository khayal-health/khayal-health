import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

async def cleanup_expired_verifications(db: AsyncIOMotorDatabase):
    """Clean up expired verification codes periodically"""
    while True:
        try:
            # Delete expired verification codes
            result = await db.verification_codes.delete_many({
                "status": "pending",
                "expires_at": {"$lt": datetime.utcnow()}
            })
            
            if result.deleted_count > 0:
                logger.info(f"Cleaned up {result.deleted_count} expired verification codes")
            
            # Wait for 1 hour before next cleanup
            await asyncio.sleep(3600)
            
        except Exception as e:
            logger.error(f"Error in cleanup task: {str(e)}")
            await asyncio.sleep(3600)
