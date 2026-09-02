# backend/app/routers/documents.py
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.folder import Folder
from app.models.user import User
from app.schemas.document import DocumentOut, DocumentUpdate, PaginatedDocuments
from app.schemas.tag import TagOut
from app.services.document_service import create_document_from_upload
from app.services.file_processor import create_thumbnail, extract_text
from app.services.folder_service import get_documents_by_folder

router = APIRouter(prefix="/documents", tags=["documents"])


async def _process_document_background(doc_id: int, file_path: str, mime_type: str):
    """Chạy nền: extract text + tạo thumbnail, dùng session riêng"""
    async with AsyncSessionLocal() as db:
        try:
            doc = await db.get(Document, doc_id)
            if not doc:
                return

            loop = asyncio.get_event_loop()
            content = await loop.run_in_executor(
                None, extract_text, file_path, mime_type
            )
            thumbnail_path = await loop.run_in_executor(
                None, create_thumbnail, file_path, mime_type, doc_id
            )

            doc.content = content
            doc.thumbnail_path = thumbnail_path
            await db.commit()
        except Exception as e:
            logging.getLogger(__name__).error(
                f"Background processing lỗi doc {doc_id}: {e}"
            )


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    workspace_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        document = await create_document_from_upload(
            db,
            upload=file,
            owner_id=current_user.id,
            title=title,
            description=description,
            category_id=category_id,
            workspace_id=workspace_id,
        )
    except ValueError as exc:
        if str(exc).startswith("duplicate_document:"):
            raise HTTPException(status_code=409, detail="Tài liệu đã tồn tại")
        raise

    await db.commit()

    # Query lại document kèm selectinload(Document.tags) để Pydantic serialize không bị lỗi
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(Document.id == document.id)
    )
    document = result.scalar_one()

    background_tasks.add_task(
        _process_document_background,
        document.id,
        document.file_path,
        document.file_type or "",
    )

    return document

@router.get("/", response_model=PaginatedDocuments)
async def list_documents(
    workspace_id: Optional[int] = Query(None),
    folder_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if folder_id is not None:
        folder = await db.get(Folder, folder_id)
        if not folder or folder.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")
        return await get_documents_by_folder(
        db, current_user.id, folder_id, page, page_size
    )

    offset = (page - 1) * page_size

    query = (
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
        )
    )
    if workspace_id:
        query = query.where(Document.workspace_id == workspace_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Document.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size else 1,
    }


@router.get("/file-types", response_model=list[str])
async def get_document_file_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document.file_type)
        .where(
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.file_type.is_not(None),
        )
        .distinct()
        .order_by(Document.file_type)
    )

    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return document


@router.get("/{document_id}/tags", response_model=list[TagOut])
async def get_document_tags(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy tài liệu"
        )

    return document.tags

@router.patch("/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: int,
    payload: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(document, key, value)

    await db.commit()
    await db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    document.is_deleted = True
    document.deleted_at = datetime.utcnow()
    await db.commit()




    