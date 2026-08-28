# app/routers/trash.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/trash", tags=["trash"])


@router.get("/")
async def list_trash(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.owner_id == current_user.id,
            Document.is_deleted == True
        )
    )
    return result.scalars().all()


@router.post("/{document_id}/restore")
async def restore_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == True
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong thùng rác")

    document.is_deleted = False
    document.deleted_at = None
    await db.commit()
    return {"detail": "Khôi phục tài liệu thành công"}


@router.delete("/{document_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == True
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong thùng rác")

    await db.delete(document)
    await db.commit()