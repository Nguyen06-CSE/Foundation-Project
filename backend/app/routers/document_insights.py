"""Cited document insights for personal and group libraries."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.services import evidence_search
from app.services.group_service import require_write_permission

router = APIRouter(prefix="/documents", tags=["document_insights"])


class Question(BaseModel):
    question: str = Field(min_length=2, max_length=1000)


@router.get("/{document_id}/index-status")
async def index_status(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    info = await evidence_search.run_info(db, user.id, document_id)
    return {"status": info["status"], "coverage": info["coverage"] or {"state": "unknown", "unit": "page", "read": 0, "total": 0}}


@router.post("/{document_id}/index-retry")
async def retry_index(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    document = await db.get(Document, document_id)
    if not document or document.is_deleted:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    if document.workspace_id is None:
        if document.owner_id != user.id:
            raise HTTPException(404, "Không tìm thấy tài liệu")
    else:
        await require_write_permission(db, document.workspace_id, user.id)
    info = await evidence_search.run_info(db, user.id, document_id)
    if info["status"] != "failed":
        return {"status": info["status"], "queued": False}
    await db.execute(text("""UPDATE document_index_runs
        SET status='pending', attempts=0, next_attempt=now(), last_error=NULL
        WHERE document_id=:doc AND checksum=(SELECT checksum FROM documents WHERE id=:doc)
          AND status='failed'"""), {"doc": document_id})
    await db.commit()
    return {"status": "pending", "queued": True}


@router.get("/{document_id}/chunks/{chunk_id}")
async def chunk(document_id: int, chunk_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await evidence_search.run_info(db, user.id, document_id)
    rows = await evidence_search.chunks(db, user.id, document_id, chunk_id)
    if not rows:
        raise HTTPException(404, "Đoạn trích không còn hiệu lực")
    row = rows[0]
    return {**row, "text": row["text"]}


@router.post("/{document_id}/questions")
async def question(document_id: int, payload: Question, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await evidence_search.question(db, user.id, document_id, payload.question)


@router.get("/{document_id}/summary")
async def summary(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await evidence_search.summary(db, user.id, document_id)


@router.get("/{document_id}/tag-suggestions")
async def tag_suggestions(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await evidence_search.tag_suggestions(db, user.id, document_id)


@router.get("/{document_id}/related")
async def related(document_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await evidence_search.related(db, user.id, document_id)
