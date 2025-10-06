from motor.motor_asyncio import AsyncIOMotorClient
from decouple import config
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def get_database() -> AsyncIOMotorClient:
    return db.database

async def connect_to_mongo():
    """Create database connection"""
    try:
        db.client = AsyncIOMotorClient(config('MONGODB_URL'))
        db.database = db.client[config('DATABASE_NAME')]
        
        # Test the connection
        await db.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        # Create unique indexes for user fields
        try:
            await db.database.users.create_index("username", unique=True)
            await db.database.users.create_index("email", unique=True)
            await db.database.users.create_index("phone", unique=True)
            logger.info("Successfully created unique indexes for users collection")
        except Exception as idx_error:
            logger.warning(f"Could not create indexes (may already exist): {idx_error}")
            
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")