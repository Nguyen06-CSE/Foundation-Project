# app/models/workspace.py
from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean, DateTime
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .academic_class import Class
    from .faculty import Faculty
    from .workspace_member import WorkspaceMember
    from .document import Document
    from .trash_batch import TrashBatch

class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    ref_class_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("classes.id"))
    ref_faculty_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("faculties.id"))
    default_member_permission: Mapped[Optional[str]] = mapped_column(String(10), default="view")
    is_deleted: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_workspaces")
    ref_class: Mapped[Optional["Class"]] = relationship("Class", back_populates="workspaces")
    ref_faculty: Mapped[Optional["Faculty"]] = relationship("Faculty", back_populates="workspaces")
    members: Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="workspace")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="workspace")
    trash_batches: Mapped[List["TrashBatch"]] = relationship("TrashBatch", back_populates="workspace")