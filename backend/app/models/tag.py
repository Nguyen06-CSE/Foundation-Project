from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey
from typing import List, Optional
from .base import Base


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # #FF5733
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tags.id"), nullable=True, index=True
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="tags")
    parent: Mapped[Optional["Tag"]] = relationship(
        "Tag", remote_side=[id], back_populates="children"
    )
    children: Mapped[List["Tag"]] = relationship("Tag", back_populates="parent")
    document_tags: Mapped[List["DocumentTag"]] = relationship(
        "DocumentTag", back_populates="tag", cascade="all, delete-orphan"
    )