# app/models/document_tag.py
from sqlalchemy import Table, Column, Integer, ForeignKey
from .base import Base

# Đây là Association Table (Bảng trung gian) cho quan hệ Many-to-Many
document_tags = Table(
    "document_tags",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
)