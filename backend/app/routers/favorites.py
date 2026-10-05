from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.favorite import Favorite
from app.models.user import User
from app.schemas.favorite import FavoriteCreate, FavoriteOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/", response_model=list[FavoriteOut])
async def list_favorites(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Favorite).where(Favorite.user_id == current_user.id))
    return result.scalars().all()


@router.post("/", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
async def add_favorite(payload: FavoriteCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    favorite = Favorite(user_id=current_user.id, document_id=payload.document_id)
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)
    return favorite


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(document_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.document_id == document_id)
    )
    favorite = result.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu thích")
    await db.delete(favorite)
    await db.commit()
