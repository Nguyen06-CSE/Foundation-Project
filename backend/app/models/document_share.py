from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, ForeignKey, String
from .base import Base, TimestampMixin

class DocumentShare(Base, TimestampMixin):
    __tablename__ = "document_shares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    source_document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    from_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    share_type: Mapped[str] = mapped_column(String(20), nullable=False)