from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class DocumentBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    workspace_id: Optional[int] = None

class DocumentCreate(DocumentBase):
    file_path: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    workspace_id: Optional[int] = None
    is_important: Optional[bool] = None

class DocumentOut(DocumentBase):
    id: int
    owner_id: int
    source_document_id: Optional[int] = None
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    checksum: str
    content: Optional[str] = None
    metadata_: Optional[dict] = Field(default=None, alias="metadata")
    search_vector: Optional[str] = None
    is_important: bool = False
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    trash_batch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)