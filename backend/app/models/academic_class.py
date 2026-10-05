# app/models/academic_class.py
from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .faculty import Faculty
    from .user import User
    from .workspace import Workspace

class Class(Base, TimestampMixin):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    faculty_id: Mapped[int] = mapped_column(Integer, ForeignKey("faculties.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    # Relationships
    faculty: Mapped["Faculty"] = relationship("Faculty", back_populates="classes")
    users: Mapped[List["User"]] = relationship("User", back_populates="student_class")
    workspaces: Mapped[List["Workspace"]] = relationship("Workspace", back_populates="ref_class")