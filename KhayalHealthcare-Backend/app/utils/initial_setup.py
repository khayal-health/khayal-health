from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User, UserRole, ApprovalStatus
from app.utils.auth import get_password_hash
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def create_default_admins(db: AsyncIOMotorDatabase):
    """Create default admin users if no admin exists"""
    try:
        # Check if any admin exists
        existing_admin = await db.users.find_one({"role": UserRole.ADMIN})
        
        if existing_admin:
            logger.info("Admin users already exist, skipping default admin creation")
            return
        
        logger.info("No admin users found, creating default admins...")
        
        # Default admin data
        default_admins = [
            {
                "username": "admin1",
                "email": "admin1@khayalhealth.com",
                "name": "Admin One",
                "phone": "0300000001"
            },
            {
                "username": "admin2", 
                "email": "admin2@khayalhealth.com",
                "name": "Admin Two",
                "phone": "0300000002"
            },
            {
                "username": "admin3",
                "email": "admin3@khayalhealth.com", 
                "name": "Admin Three",
                "phone": "0300000003"
            }
        ]
        
        # Hash the default password
        hashed_password = get_password_hash("admin123")
        
        # Create admin users
        for admin_data in default_admins:
            admin_user = {
                "username": admin_data["username"],
                "email": admin_data["email"],
                "password": hashed_password,
                "name": admin_data["name"],
                "phone": admin_data["phone"],
                "role": UserRole.ADMIN,
                "approval_status": ApprovalStatus.APPROVED,
                "email_verified": True,
                "phone_verified": True,
                "verified_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "available": True
            }
            
            await db.users.insert_one(admin_user)
            logger.info(f"Created default admin user: {admin_data['username']}")
        
        logger.info("Default admin users created successfully")
        logger.warning("IMPORTANT: Please change the default admin passwords immediately!")
        
    except Exception as e:
        logger.error(f"Error creating default admin users: {str(e)}")
        raise
