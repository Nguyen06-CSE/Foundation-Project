from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FavoriteCreate(BaseModel):
    document_id: int


class FavoriteOut(BaseModel):
    user_id: int
    document_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
