from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String, DateTime
from .base import Base

if TYPE_CHECKING:
    from .workspace import Workspace
    from .document import Document

class TrashBatch(Base):
    __tablename__ = "trash_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workspaces.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    deleted_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow)
    purge_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="trash_batches")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="trash_batch")