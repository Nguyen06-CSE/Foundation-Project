from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    parent_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    parent_id: Optional[int] = None


class CategoryOut(CategoryBase):
    id: int
    owner_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
