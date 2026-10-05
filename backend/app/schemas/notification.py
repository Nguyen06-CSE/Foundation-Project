from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    workspace_id: Optional[int] = None
    document_id: Optional[int] = None
    message: str
    is_read: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)