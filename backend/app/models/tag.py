# app/models/tag.py
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey
from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .document import Document

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(7))
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tags.id"))

    # Relationships
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="tags")
    parent: Mapped[Optional["Tag"]] = relationship("Tag", remote_side=[id], back_populates="sub_tags")
    sub_tags: Mapped[List["Tag"]] = relationship("Tag", back_populates="parent")
    documents: Mapped[List["Document"]] = relationship("Document", secondary="document_tags", back_populates="tags")
    folder_tags: Mapped[List["FolderTag"]] = relationship("FolderTag", back_populates="tag")
    folders: Mapped[List["Folder"]] = relationship(
        "Folder", secondary="folder_tags", back_populates="tags", viewonly=True
    )