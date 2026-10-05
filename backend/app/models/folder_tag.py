from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class FolderTag(Base):
    __tablename__ = "folder_tags"
    folder_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("folders.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )
    folder: Mapped["Folder"] = relationship("Folder", back_populates="folder_tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="folder_tags")
