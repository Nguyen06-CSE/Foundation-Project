# backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    Token,
    UserInfo,
    UserLogin,
    UserRegister,
    get_login_payload,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    result = await db.execute(select(User).where(User.username == payload.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username đã được sử dụng")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=getattr(payload, "role", None) or "student",
        student_code=getattr(payload, "student_code", None),
        class_id=getattr(payload, "class_id", None),
        faculty_id=getattr(payload, "faculty_id", None),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    from app.services.folder_service import create_default_folders_for_user
    await create_default_folders_for_user(db, user.id)

    return {"id": user.id, "email": user.email, "username": user.username}


@router.post("/login", response_model=Token)
async def login(
    payload: UserLogin = Depends(get_login_payload),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(
            or_(
                User.email == payload.identifier,
                User.username == payload.identifier,
                User.student_code == payload.identifier,
            )
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai thông tin đăng nhập. Vui lòng kiểm tra lại.",
        )

    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserInfo.model_validate(user),
    )


@router.get("/me", response_model=UserInfo)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user