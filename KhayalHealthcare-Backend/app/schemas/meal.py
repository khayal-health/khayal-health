from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class MealCreate(BaseModel):
    name: str
    description: str
    price: float
    ingredients: List[str] = []
    dietary_info: Optional[str] = None
    meal_visibility: bool = True

class MealResponse(BaseModel):
    id: str = Field(alias="_id")
    chef_id: str
    name: str
    description: str
    price: float
    ingredients: List[str]
    dietary_info: Optional[str] = None
    meal_visibility: bool
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)
