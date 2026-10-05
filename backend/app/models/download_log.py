from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .document import Document

class DownloadLog(Base, TimestampMixin):
    __tablename__ = "download_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="download_logs")
    document: Mapped["Document"] = relationship("Document")