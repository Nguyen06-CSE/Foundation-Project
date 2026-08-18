from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer
from typing import List, Optional
from .base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="personal", server_default="personal")

    # Relationships
    categories: Mapped[List["Category"]] = relationship("Category", back_populates="owner")
    tags: Mapped[List["Tag"]] = relationship("Tag", back_populates="owner")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="owner")
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="user")
    favorites: Mapped[List["Favorite"]] = relationship("Favorite", back_populates="user")
    download_logs: Mapped[List["DownloadLog"]] = relationship("DownloadLog", back_populates="user")
    uploaded_versions: Mapped[List["DocumentVersion"]] = relationship(
        "DocumentVersion", back_populates="uploader"
    )