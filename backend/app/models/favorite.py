from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, DateTime, func, PrimaryKeyConstraint
from datetime import datetime
from .base import Base


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (PrimaryKeyConstraint("user_id", "document_id"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    document: Mapped["Document"] = relationship("Document", back_populates="favorites")