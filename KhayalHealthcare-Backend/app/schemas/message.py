from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class MessageCreate(BaseModel):
    from_id: str
    to_id: str
    content: str

class MessageResponse(BaseModel):
    id: str = Field(alias="_id")
    from_id: str
    to_id: str
    content: str
    timestamp: datetime
    read: bool

    model_config = ConfigDict(populate_by_name=True)