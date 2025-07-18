"""Utility functions and dependencies"""

from app.utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

from app.utils.dependencies import (
    get_current_user,
    get_admin_user,
    security
)

from app.utils.initial_setup import create_default_admins

__all__ = [
    # Auth utilities
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "verify_token",

    # Dependencies
    "get_current_user",
    "get_admin_user",
    "security",
    
    # Setup utilities
    "create_default_admins",

    # Constants (use with caution)
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES"
]
