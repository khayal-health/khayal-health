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

    # Constants (use with caution)
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES"
]
