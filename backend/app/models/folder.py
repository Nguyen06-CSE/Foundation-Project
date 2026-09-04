# backend/app/models/folder.py

from typing import Optional, List
from sqlalchemy import Integer, String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

class Folder(Base, TimestampMixin):
    __tablename__ = "folders"
    __table_args__ = (
        Index("ix_folders_workspace_id", "workspace_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)

    owner: Mapped["User"] = relationship("User", back_populates="folders")
    folder_tags: Mapped[List["FolderTag"]] = relationship(
        "FolderTag", back_populates="folder", cascade="all, delete-orphan"
    )
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", secondary="folder_tags", back_populates="folders", viewonly=True
    )
    workspace: Mapped[Optional["Workspace"]] = relationship(
    "Workspace", back_populates="folders"
)
