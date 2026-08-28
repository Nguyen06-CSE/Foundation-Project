from typing import TYPE_CHECKING, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .document import Document
    from .user import User

class DocumentVersion(Base, TimestampMixin):
    __tablename__ = "document_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    checksum: Mapped[Optional[str]] = mapped_column(String(64))
    uploaded_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    note: Mapped[Optional[str]] = mapped_column(String(255))

    document: Mapped["Document"] = relationship("Document", back_populates="versions")
    uploader: Mapped[Optional["User"]] = relationship("User", back_populates="uploaded_versions")