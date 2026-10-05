# app/models/category.py
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .document import Document

class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("categories.id"))

    # Relationships
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="categories")
    parent: Mapped[Optional["Category"]] = relationship("Category", remote_side=[id], back_populates="sub_categories")
    sub_categories: Mapped[List["Category"]] = relationship("Category", back_populates="parent")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="category")