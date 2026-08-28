# app/routers/documents.py
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


@router.get("/", response_model=list[DocumentOut])
async def list_documents(
    workspace_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Document).where(
        Document.owner_id == current_user.id,
        Document.is_deleted == False
    )
    if workspace_id:
        query = query.where(Document.workspace_id == workspace_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
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