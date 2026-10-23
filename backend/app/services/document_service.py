# backend/app/services/document_service.py

from __future__ import annotations

import hashlib
import io
import os
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.download_log import DownloadLog
from app.models.tag import Tag  # <-- Thêm dòng này
from app.services.file_service import checksum_for_file, save_upload_file




async def create_document_from_upload(
    db: AsyncSession, 
    *, 
    upload, 
    owner_id: int, 
    title: str, 
    description: str | None = None, 
    category_id: int | None = None, 
    workspace_id: int | None = None,
    tag_ids: list[int] | None = None,  # <-- Thêm tham số tag_ids
    content: str | None = None,
    thumbnail_path: str | None = None,
):
    # BƯỚC 1: Đọc nội dung file vào RAM để tính checksum trước
    #         (không ghi ra disk ở bước này)
    content_bytes = await upload.read()
    checksum = hashlib.sha256(content_bytes).hexdigest()

    # BƯỚC 2: Kiểm tra trùng lặp (kể cả file trong thùng rác)
    query_active = select(Document).where(
        Document.checksum == checksum,
        Document.is_deleted == False,
    )
    query_trash = select(Document).where(
        Document.checksum == checksum,
        Document.is_deleted == True,
    )
    if workspace_id:
        query_active = query_active.where(
            Document.workspace_id == workspace_id
        )
        query_trash = query_trash.where(
            Document.workspace_id == workspace_id
        )
    else:
        query_active = query_active.where(
            Document.owner_id == owner_id,
            Document.workspace_id.is_(None)
        )
        query_trash = query_trash.where(
            Document.owner_id == owner_id,
            Document.workspace_id.is_(None)
        )

    # Tìm bản active trùng
    existing_active = (
        await db.execute(query_active)
    ).scalar_one_or_none()
    if existing_active:
        raise ValueError(
            f"duplicate_document:{existing_active.id}"
        )

    # Tìm bản trong thùng rác trùng — trả lỗi đặc biệt để FE xử lý
    existing_trash = (
        await db.execute(query_trash)
    ).scalar_one_or_none()
    if existing_trash:
        raise ValueError(
            f"in_trash:{existing_trash.id}:{existing_trash.title}"
        )

    # BƯỚC 3: Chỉ lưu file ra disk SAU KHI đã xác nhận không trùng
    # Reset stream position vì đã read() ở bước 1
    upload.file = io.BytesIO(content_bytes)
    file_path = save_upload_file(upload, owner_id)
        
    document = Document(
        owner_id=owner_id,
        category_id=category_id,
        workspace_id=workspace_id,
        title=title,
        description=description,
        file_path=file_path,
        thumbnail_path=thumbnail_path,
        file_type=upload.content_type,
        file_size=os.path.getsize(file_path) if file_path else getattr(upload, "size", None),
        checksum=checksum,
        content=content,
    )

    # Truy vấn các Tag hợp lệ và gắn vào quan hệ document.tags
    if tag_ids:
        tag_stmt = select(Tag).where(Tag.id.in_(tag_ids))
        tag_result = await db.execute(tag_stmt)
        tags = tag_result.scalars().all()
        document.tags = list(tags)

    db.add(document)
    await db.flush()
    return document

async def add_document_version(db: AsyncSession, *, document: Document, file_path: str, uploaded_by: int | None, note: str | None, checksum: str | None = None):
    result = await db.execute(
        select(func.coalesce(func.max(DocumentVersion.version_no), 0)).where(DocumentVersion.document_id == document.id)
    )
    next_version = int(result.scalar_one()) + 1
    version = DocumentVersion(
        document_id=document.id,
        version_no=next_version,
        file_path=file_path,
        checksum=checksum,
        uploaded_by=uploaded_by,
        note=note,
    )
    db.add(version)
    await db.flush()
    return version


async def log_download(db: AsyncSession, *, document_id: int, user_id: int, action: str):
    log = DownloadLog(document_id=document_id, user_id=user_id, action=action)
    db.add(log)
    await db.flush()
    return log

async def get_document_file_types(db: AsyncSession, owner_id: int) -> list[str]:
    result = await db.execute(
        select(Document.file_type)
        .where(
            Document.owner_id == owner_id,
            Document.is_deleted == False,
            Document.file_type.is_not(None)
        )
        .distinct()
        .order_by(Document.file_type)
    )
    return result.scalars().all()