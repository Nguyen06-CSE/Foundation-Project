from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .document import Document

class Favorite(Base, TimestampMixin):
    __tablename__ = "favorites"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), primary_key=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), primary_key=True)

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    document: Mapped["Document"] = relationship("Document")