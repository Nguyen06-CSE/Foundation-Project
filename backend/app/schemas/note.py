from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class NoteCreate(BaseModel):
    document_id: int
    note: str = Field(min_length=1)


class NoteUpdate(BaseModel):
    note: str = Field(min_length=1)


class NoteOut(BaseModel):
    id: int
    document_id: int
    user_id: int
    note: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
