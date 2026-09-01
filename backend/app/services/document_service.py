# backend/app/services/document_service.py

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.download_log import DownloadLog
from app.services.file_service import checksum_for_file, save_upload_file





async def create_document_from_upload(
    db: AsyncSession, 
    *, 
    upload, 
    owner_id: int, 
    title: str, 
    description: str | None, 
    category_id: int | None, 
    workspace_id: int | None = None, # Thêm tham số workspace_id
    content: str | None = None
):
    file_path = save_upload_file(upload, owner_id)
    checksum = checksum_for_file(file_path)
    
    # Kiểm tra file trùng lặp (Bỏ qua các file đã xóa mềm)
    query = select(Document).where(
        Document.checksum == checksum, 
        Document.is_deleted == False
    )
    if workspace_id:
        query = query.where(Document.workspace_id == workspace_id)
    else:
        query = query.where(Document.owner_id == owner_id, Document.workspace_id.is_(None))
        
    result = await db.execute(query)
    existing = result.scalar_one_or_none()
    
    if existing:
        raise ValueError(f"duplicate_document:{existing.id}")
        
    document = Document(
        owner_id=owner_id,
        category_id=category_id,
        workspace_id=workspace_id, # Gán workspace_id cho model
        title=title,
        description=description,
        file_path=file_path,
        file_type=upload.content_type,
        file_size=getattr(upload, "size", None),
        checksum=checksum,
        content=content,
    )
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