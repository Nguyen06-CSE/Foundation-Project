# backend/app/schemas/tag.py

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class TagBase(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    color: Optional[str] = Field(default=None, max_length=7)
    parent_id: Optional[int] = None

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    color: Optional[str] = Field(default=None, max_length=7)
    parent_id: Optional[int] = None

class TagOut(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    owner_id: Optional[int] = None  
    workspace_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TagStatsOut(TagOut):
    document_count: int = 0
    folder_count: int = 0


class TagMergeIn(BaseModel):
    source_ids: List[int] = Field(min_length=1)
    target_id: int
