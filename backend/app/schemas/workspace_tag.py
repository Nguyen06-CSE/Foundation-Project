# backend/app/schemas/workspace_tag.py

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceTagCreate(BaseModel):
    """Tạo tag mới trong workspace"""
    name: str = Field(..., min_length=1, max_length=128)
    color: Optional[str] = Field(default=None, max_length=7)


class WorkspaceTagImport(BaseModel):
    """Import tags từ personal vào workspace"""
    tag_ids: list[int] = Field(..., min_items=1)


class WorkspaceTagOut(BaseModel):
    """Thông tin tag trong workspace"""
    id: int  # workspace_tag.id
    workspace_id: int
    tag_id: int
    name: str
    color: Optional[str] = None
    owner_user_id: int
    owner_username: str
    owner_full_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceTagUpdate(BaseModel):
    """Rename tag trong workspace"""
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    color: Optional[str] = Field(None, max_length=7)