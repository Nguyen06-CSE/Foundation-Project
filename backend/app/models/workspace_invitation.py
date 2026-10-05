# backend/app/models/workspace_invitation.py

from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Index, Integer, ForeignKey, String, DateTime, func
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .workspace import Workspace
    from .user import User

class WorkspaceInvitation(Base):
    __tablename__ = "workspace_invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    invited_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    invited_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default='pending', nullable=False
    )
    message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="invitations"
    )
    invited_user: Mapped["User"] = relationship(
        "User", foreign_keys=[invited_user_id],
        back_populates="received_invitations"
    )
    inviter: Mapped["User"] = relationship(
        "User", foreign_keys=[invited_by],
        back_populates="sent_invitations"
    )

    __table_args__ = (
        Index("ix_workspace_invitations_invited_user", "invited_user_id", "status"),
    )