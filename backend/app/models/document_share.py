from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String, DateTime, Index, text
from .base import Base, TimestampMixin

class DocumentShare(Base, TimestampMixin):
    __tablename__ = "document_shares"
    __table_args__ = (
        Index("ix_document_shares_to_user_status", "to_user_id", "status"),
        Index("ix_document_shares_from_user_status", "from_user_id", "status"),
        Index(
            "uq_document_share_pending",
            "from_user_id",
            "to_user_id",
            "source_document_id",
            unique=True,
            postgresql_where=text("status = 'pending' AND source_document_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_document_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    document_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    from_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    source_workspace_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    share_type: Mapped[str] = mapped_column(String(20), default="direct")
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    source_document = relationship("Document", foreign_keys=[source_document_id], lazy="selectin")
    document = relationship("Document", foreign_keys=[document_id], lazy="selectin")
    from_user = relationship("User", foreign_keys=[from_user_id], lazy="selectin")
    to_user = relationship("User", foreign_keys=[to_user_id], lazy="selectin")
