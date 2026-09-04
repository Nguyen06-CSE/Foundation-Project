# backend/app/models/trash_batch.py
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, List
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

if TYPE_CHECKING:
    from .workspace import Workspace
    from .user import User
    from .document import Document

class TrashBatch(Base):
    __tablename__ = "trash_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    deleted_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    deleted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    purge_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    # Relationships
    workspace: Mapped[Optional["Workspace"]] = relationship(
        "Workspace", back_populates="trash_batches"
    )
    deleter: Mapped["User"] = relationship(
        "User", foreign_keys=[deleted_by]
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="trash_batch"
    )

    def __repr__(self) -> str:
        return f"<TrashBatch(id={self.id}, name='{self.name}', purge_at={self.purge_at})>"