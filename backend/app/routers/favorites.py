from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.favorite import Favorite
from app.models.user import User
from app.schemas.document import FavoriteDocumentOut
from app.schemas.favorite import FavoriteCreate, FavoriteOut
from app.services.document_service import user_can_access_document

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/", response_model=list[FavoriteDocumentOut])
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document, Favorite.created_at)
        .join(Favorite, Favorite.document_id == Document.id)
        .options(selectinload(Document.tags))
        .where(
            Favorite.user_id == current_user.id,
            Document.is_deleted == False,
        )
        .order_by(Favorite.created_at.desc())
    )
    rows = result.all()
    items = []
    for doc, favorited_at in rows:
        item = FavoriteDocumentOut.model_validate(doc)
        item.favorited_at = favorited_at
        items.append(item)
    return items


@router.post("/", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    payload: FavoriteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check document existence and access permission
    doc_res = await db.execute(
        select(Document).where(
            Document.id == payload.document_id,
            Document.is_deleted == False,
        )
    )
    document = doc_res.scalar_one_or_none()
    if not document or not await user_can_access_document(db, document, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu hoặc không có quyền truy cập",
        )

    existing = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.document_id == payload.document_id,
        )
    )
    if existing.scalar_one_or_none():
        favorite = existing.scalar_one_or_none()
        return favorite

    favorite = Favorite(user_id=current_user.id, document_id=payload.document_id)
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)
    return favorite


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.document_id == document_id,
        )
    )
    favorite = result.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu thích")
    await db.delete(favorite)
    await db.commit()

