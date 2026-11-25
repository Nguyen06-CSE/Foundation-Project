# backend/app/models/trash_batch.py
"""
DEPRECATED (Phase 4): Bảng trash_batches và mô hình ORM tương ứng đã được loại bỏ
khỏi cơ sở dữ liệu và Base.metadata trong migration a2b3c4d5e6f7.
File này được giữ lại như một legacy stub để duy trì khả năng tương thích mã nguồn.
"""
from typing import Optional, ClassVar


class TrashBatch:
    """
    DEPRECATED (Phase 4): Bảng trash_batches đã được loại bỏ khỏi DB trong migration a2b3c4d5e6f7.
    Giao diện thùng rác hiện gom nhóm động theo ngày dựa trên Document.deleted_at.
    """
    __tablename__ = "trash_batches"

    id: Optional[int] = None
    workspace_id: Optional[int] = None
    name: Optional[str] = None
    deleted_by: Optional[int] = None
    deleted_at: Optional[object] = None
    purge_at: Optional[object] = None
    documents: ClassVar[Optional[object]] = None

    def __repr__(self) -> str:
        return f"<TrashBatch(id={self.id}, name='{self.name}', purge_at={self.purge_at})>"
