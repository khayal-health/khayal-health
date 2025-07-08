"""API route handlers"""

from app.routers import (
    auth,
    user,
    admin,
    vitals,
    meals,
    orders,
    appointments,
    messages,
    visit_requests,
    advertisements,
    coupons,
    subscription_plans,
)

# List all routers for easy registration
routers = [
    auth.router,
    user.router,
    admin.router,
    vitals.router,
    meals.router,
    orders.router,
    appointments.router,
    messages.router,
    visit_requests.router,
    advertisements.router,
    coupons.router,
    subscription_plans.router,
]

__all__ = [
    "auth",
    "user",
    "admin",
    "vitals",
    "meals",
    "orders",
    "appointments",
    "messages",
    "visit_requests",
    "routers",
    "advertisements",
    "coupons",
    "subscription_plans"
]
