from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import Token, UserLogin, UserRegister

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
        role=payload.role or "personal",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "email": user.email, "username": user.username}


# @router.post("/login", response_model=Token)
# async def login(
#     form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
#     result = await db.execute(
#         select(User).where(
#             or_(User.email == form_data.username, User.username == form_data.username)
#         )
#     )
#     user = result.scalar_one_or_none()
    
#     if not user or not verify_password(form_data.password, user.password_hash):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED, 
#             detail="Sai tài khoản hoặc mật khẩu"
#         )
        
#     token = create_access_token({"sub": str(user.id)})
#     return Token(access_token=token)

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(
            or_(
                User.email == form_data.username,
                User.username == form_data.username
            )
        )
    )

    user = result.scalar_one_or_none()

    print("LOGIN USERNAME:", form_data.username)
    print("USER FOUND:", user is not None)

    if user:
        print("USER ID:", user.id)
        print("DB USERNAME:", user.username)
        print("DB EMAIL:", user.email)
        print("PASSWORD HASH:", user.password_hash)

        password_valid = verify_password(
            form_data.password,
            user.password_hash
        )

        print("PASSWORD VALID:", password_valid)

    else:
        password_valid = False

    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tài khoản hoặc mật khẩu"
        )

    token = create_access_token({
        "sub": str(user.id)
    })

    return Token(access_token=token)