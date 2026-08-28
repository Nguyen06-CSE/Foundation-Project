from typing import Optional
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

class TagOut(TagBase):
    id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)