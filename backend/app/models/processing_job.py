from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .document import Document

class ProcessingJob(Base, TimestampMixin):
    __tablename__ = "processing_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[Optional[str]] = mapped_column(String(20), default="pending")
    result: Mapped[Optional[dict]] = mapped_column(JSONB)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    document: Mapped["Document"] = relationship("Document")