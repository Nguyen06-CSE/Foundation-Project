from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Integer, String, ForeignKey, DateTime,
    func, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .workspace import Workspace
    from .tag import Tag
    from .user import User


class WorkspaceTag(Base, TimestampMixin):
    """
    Reference table: map tags vào workspace (Group)
    - Cho phép mỗi tag chỉ xuất hiện 1 lần trong 1 workspace
    - Theo dõi ai import/tạo tag này vào workspace
    """
    __tablename__ = "workspace_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    workspace_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False
    )
    
    # Người tạo/import tag này vào workspace
    owner_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="workspace_tags"
    )
    tag: Mapped["Tag"] = relationship("Tag", back_populates="workspace_tags")
    owner: Mapped["User"] = relationship("User", back_populates="workspace_tags_created")

    # Indexes
    __table_args__ = (
        UniqueConstraint("workspace_id", "tag_id", name="uq_workspace_tag"),
        Index("ix_workspace_id", "workspace_id"),
        Index("ix_tag_id", "tag_id"),
        Index("ix_owner_user_id", "owner_user_id"),
    )

    def __repr__(self) -> str:
        return f"<WorkspaceTag(workspace_id={self.workspace_id}, tag_id={self.tag_id})>"