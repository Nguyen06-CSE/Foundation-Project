from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DocumentBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None


class DocumentCreate(DocumentBase):
    file_path: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    is_important: Optional[bool] = None
    content: Optional[str] = None


class DocumentOut(DocumentBase):
    id: int
    owner_id: int
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    checksum: str
    content: Optional[str] = None
    metadata_: Optional[dict] = None
    search_vector: Optional[str] = None
    is_important: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
