from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, Any
from datetime import datetime
from .base import Base


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'ocr' | 'thumbnail' | 'checksum'
    status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending"
    )  # pending | running | done | failed
    result: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    document: Mapped["Document"] = relationship("Document", back_populates="processing_jobs")