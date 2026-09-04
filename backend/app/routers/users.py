# backend/app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import PasswordUpdate, PasswordUpdate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "password":
            current_user.password_hash = hash_password(value)
        elif hasattr(current_user, field):
            setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/password")
async def update_password(
    payload: PasswordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Kiểm tra mật khẩu cũ có khớp không (giả sử bạn có hàm verify_password)
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
        
    # 2. Cập nhật mật khẩu mới
    current_user.password_hash = hash_password(payload.new_password)
    
    await db.commit()
    return {"message": "Đổi mật khẩu thành công"}


@router.get("/search", response_model=list[UserOut])
async def search_users(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    keyword = f"%{q}%"
    result = await db.execute(
        select(User)
        .where(
            User.id != current_user.id,
            or_(
                User.username.ilike(keyword),
                User.email.ilike(keyword),
                User.student_code.ilike(keyword),
                User.full_name.ilike(keyword),
            ),
        )
        .limit(10)
    )
    return result.scalars().all()
