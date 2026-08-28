from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class WorkspaceBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    type: str = Field(max_length=20)
    description: Optional[str] = None
    default_member_permission: Optional[str] = Field(default="view", max_length=10)

class WorkspaceCreate(WorkspaceBase):
    ref_class_id: Optional[int] = None
    ref_faculty_id: Optional[int] = None

class WorkspaceOut(WorkspaceBase):
    id: int
    owner_id: int
    ref_class_id: Optional[int] = None
    ref_faculty_id: Optional[int] = None
    is_deleted: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)