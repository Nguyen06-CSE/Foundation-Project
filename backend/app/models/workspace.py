# backend/app/models/workspace.py
from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from pydantic import Tag
from sqlalchemy import (
    Integer, String, Text, Boolean, DateTime,
    ForeignKey, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.workspace_tag import WorkspaceTag
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .workspace_member import WorkspaceMember
    from .workspace_invitation import WorkspaceInvitation
    from .document import Document
    from .folder import Folder
    from .classes import Class
    from .faculty import Faculty
    from .trash_batch import TrashBatch  

class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(20), default='group', nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    
    # Thêm 2 cột mới cho Faculty và Class
    ref_class_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("classes.id"), nullable=True
    )
    ref_faculty_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("faculties.id"), nullable=True
    )
    
    default_member_permission: Mapped[str] = mapped_column(
        String(10), default='view', nullable=False
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_dissolving: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dissolve_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User", foreign_keys=[owner_id], back_populates="owned_workspaces"
    )
    members: Mapped[List["WorkspaceMember"]] = relationship(
        "WorkspaceMember", back_populates="workspace",
        cascade="all, delete-orphan"
    )
    invitations: Mapped[List["WorkspaceInvitation"]] = relationship(
        "WorkspaceInvitation", back_populates="workspace",
        cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="workspace"
    )
    folders: Mapped[List["Folder"]] = relationship(
        "Folder", back_populates="workspace"
    )
    
    # Relationships với Class và Faculty
    ref_class: Mapped[Optional["Class"]] = relationship(
        "Class", back_populates="workspaces"
    )
    ref_faculty: Mapped[Optional["Faculty"]] = relationship(
        "Faculty", back_populates="workspaces"
    )

    # Relationship với TrashBatch (thêm mới)
    trash_batches: Mapped[List["TrashBatch"]] = relationship(
        "TrashBatch", back_populates="workspace"
    )
    tags: Mapped[List["Tag"]] = relationship("Tag", back_populates="workspace", cascade="all, delete-orphan")
    
    workspace_tags: Mapped[List["WorkspaceTag"]] = relationship(
        "WorkspaceTag", back_populates="workspace",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Workspace(id={self.id}, name='{self.name}', type='{self.type}')>"