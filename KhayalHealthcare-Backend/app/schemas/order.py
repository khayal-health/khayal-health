from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import OrderStatus

class OrderCreate(BaseModel):
    subscriber_id: str
    chef_id: str
    meal_id: str
    quantity: int = 1
    total_price: float
    delivery_address: str

class OrderResponse(BaseModel):
    id: str = Field(alias="_id")
    subscriber_id: str
    chef_id: str
    meal_id: str
    quantity: int
    total_price: float
    delivery_address: str
    status: OrderStatus
    timestamp: datetime

    model_config = ConfigDict(populate_by_name=True)

class OrderStatusUpdate(BaseModel):
    status: OrderStatus