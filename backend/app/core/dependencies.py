# app/core/dependencies.py
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

# tokenUrl trỏ tới endpoint login thực tế (routers/auth.py)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Giải mã token, tìm user tương ứng trong DB.
    Ném lỗi 401 nếu token không hợp lệ hoặc user không tồn tại.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không xác thực được người dùng",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user


async def get_optional_user(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Giải mã token nếu có, trả về User nếu hợp lệ, None nếu không có hoặc không hợp lệ.
    """
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if payload is None:
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        result = await db.execute(select(User).where(User.id == int(user_id)))
        return result.scalar_one_or_none()
    except Exception:
        return None
    
    
def verify_faculty_access(current_user: User, faculty_code: str) -> bool:
    """
    system_admin/school_admin: Quản lý toàn bộ các khoa.
    faculty_admin: Chỉ quản lý khoa có code trùng với prefix email (vd: cntt@school.edu.vn -> code 'cntt').
    """
    if current_user.role in ["system_admin", "school_admin"]:
        return True
    
    if current_user.role == "faculty_admin":
        user_email_prefix = current_user.email.split("@")[0].lower()
        if user_email_prefix == faculty_code.lower():
            return True
            
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền quản lý môn học của Khoa này"
    )