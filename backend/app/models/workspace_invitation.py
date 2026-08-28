from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String, DateTime
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .workspace import Workspace
    from .user import User

class WorkspaceInvitation(Base, TimestampMixin):
    __tablename__ = "workspace_invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id"), nullable=False)
    invited_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    invited_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[Optional[str]] = mapped_column(String(20), default="pending")
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    workspace: Mapped["Workspace"] = relationship("Workspace")
    invited_user: Mapped["User"] = relationship("User", foreign_keys=[invited_user_id])
    inviter: Mapped["User"] = relationship("User", foreign_keys=[invited_by])