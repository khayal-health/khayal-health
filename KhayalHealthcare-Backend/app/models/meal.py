from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from app.models.user import PyObjectId
from bson import ObjectId

class Meal(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    chef_id: PyObjectId
    name: str
    description: str
    price: float
    ingredients: List[str] = []
    dietary_info: Optional[str] = None
    meal_visibility: bool = True 
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True, 
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
