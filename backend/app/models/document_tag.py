from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, PrimaryKeyConstraint
from .base import Base


class DocumentTag(Base):
    __tablename__ = "document_tags"
    __table_args__ = (PrimaryKeyConstraint("document_id", "tag_id"),)

    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)

    document: Mapped["Document"] = relationship("Document", back_populates="document_tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="document_tags")