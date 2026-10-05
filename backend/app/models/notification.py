from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, ForeignKey, String, Boolean
from .base import Base, TimestampMixin

class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    workspace_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workspaces.id"))
    document_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documents.id"))
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    is_read: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)