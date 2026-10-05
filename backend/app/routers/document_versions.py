# app/routers/document_versions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.user import User

router = APIRouter(prefix="/document-versions", tags=["document_versions"])


@router.get("/{document_id}")
async def get_document_versions(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_res = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False
        )
    )
    if not doc_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    result = await db.execute(
        select(DocumentVersion).where(DocumentVersion.document_id == document_id)
    )
    return result.scalars().all()