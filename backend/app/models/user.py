# app/models/user.py
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .academic_class import Class
    from .faculty import Faculty
    from .category import Category
    from .tag import Tag
    from .workspace import Workspace
    from .workspace_member import WorkspaceMember
    from .document import Document
    from .note import Note
    from .favorite import Favorite
    from .download_log import DownloadLog
    from .document_version import DocumentVersion

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(150))
    role: Mapped[str] = mapped_column(String(20), default="student", server_default="student", nullable=False)
    student_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    class_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("classes.id"))
    faculty_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("faculties.id"))

    # Relationships
    student_class: Mapped[Optional["Class"]] = relationship("Class", back_populates="users")
    faculty: Mapped[Optional["Faculty"]] = relationship("Faculty", back_populates="users")
    categories: Mapped[List["Category"]] = relationship("Category", back_populates="owner")
    tags: Mapped[List["Tag"]] = relationship("Tag", back_populates="owner")
    owned_workspaces: Mapped[List["Workspace"]] = relationship("Workspace", back_populates="owner")
    workspace_memberships: Mapped[List["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="user")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="owner")
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="user")
    favorites: Mapped[List["Favorite"]] = relationship("Favorite", back_populates="user")
    download_logs: Mapped[List["DownloadLog"]] = relationship("DownloadLog", back_populates="user")
    uploaded_versions: Mapped[List["DocumentVersion"]] = relationship("DocumentVersion", back_populates="uploader")
    folders: Mapped[List["Folder"]] = relationship("Folder", back_populates="owner")