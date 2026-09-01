# backend/app/routers/documents.py
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentOut, DocumentUpdate
from app.services.document_service import create_document_from_upload

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
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
    await db.refresh(document)
    return document


from fastapi import Query
from sqlalchemy import func
from app.schemas.document import PaginatedDocuments
from app.models.folder import Folder
from app.services.folder_service import get_documents_by_folder
from sqlalchemy.orm import selectinload

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
            raise HTTPException(404, "Không tìm thấy thư mục")
        return await get_documents_by_folder(db, current_user.id, folder_id, page, page_size)

    offset = (page - 1) * page_size
    
    # 2. Bổ sung .options(selectinload(Document.tags)) vào câu query
    query = select(Document).options(selectinload(Document.tags)).where(
        Document.owner_id == current_user.id,
        Document.is_deleted == False
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
        "total_pages": (total + page_size - 1) // page_size if page_size else 1
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
            Document.file_type.is_not(None)
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
    # Bổ sung .options(selectinload(Document.tags)) tại đây nữa
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return document

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
            Document.is_deleted == False
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
            Document.is_deleted == False
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Thực hiện Xóa Mềm (Soft Delete)
    document.is_deleted = True
    document.deleted_at = datetime.utcnow()
    await db.commit()


