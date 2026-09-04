# backend/app/models/classes.py
from __future__ import annotations
from typing import TYPE_CHECKING, Optional, List
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

if TYPE_CHECKING:
    from .faculty import Faculty
    from .workspace import Workspace
    from .user import User

class Class(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    faculty_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("faculties.id", ondelete="RESTRICT"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    faculty: Mapped["Faculty"] = relationship(
        "Faculty", back_populates="classes"
    )
    
    # Relationship với User (sinh viên thuộc lớp này)
    students: Mapped[List["User"]] = relationship(
        "User", back_populates="class_", foreign_keys="[User.class_id]"
    )
    
    # Relationship với Workspace (workspace kiểu class)
    workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace", back_populates="ref_class"
    )

    def __repr__(self) -> str:
        return f"<Class(id={self.id}, code='{self.code}', name='{self.name}')>"