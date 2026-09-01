# backend/app/core/security.py

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

try:
    from jose import jwt, JWTError  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    class JWTError(Exception):
        pass

    class _FallbackJWT:
        @staticmethod
        def encode(payload: dict, secret: str, algorithm: str = "HS256") -> str:
            header = {"alg": algorithm, "typ": "JWT"}
            header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b"=")
            payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, default=str).encode()).rstrip(b"=")
            signing_input = header_b64 + b"." + payload_b64
            signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
            signature_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=")
            return b".".join([header_b64, payload_b64, signature_b64]).decode()

        @staticmethod
        def decode(token: str, secret: str, algorithms: list[str]):
            try:
                header_b64, payload_b64, signature_b64 = token.encode().split(b".")
                signing_input = header_b64 + b"." + payload_b64
                expected = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
                if base64.urlsafe_b64encode(expected).rstrip(b"=") != signature_b64:
                    raise JWTError("invalid signature")
                payload = json.loads(base64.urlsafe_b64decode(payload_b64 + b"=="))
                exp = payload.get("exp")
                if exp:
                    exp_dt = datetime.fromisoformat(exp)
                    if exp_dt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                        raise JWTError("token expired")
                return payload
            except Exception as exc:
                raise JWTError(str(exc)) from exc

    jwt = _FallbackJWT()

from passlib.context import CryptContext

from app.core.config import settings

# ── Cấu hình hash mật khẩu ──────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_PASSWORD_PEPPER = "foundation-project-pepper"


# def hash_password(password: str) -> str:
#     """Băm mật khẩu trước khi lưu vào database."""
#     try:
#         return pwd_context.hash(password)
#     except Exception:  # pragma: no cover - local env fallback
#         digest = hashlib.sha256(f"{_PASSWORD_PEPPER}:{password}".encode()).hexdigest()
#         return f"sha256${digest}"

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     if hashed_password.startswith("sha256$"):
#         digest = hashlib.sha256(
#             f"{_PASSWORD_PEPPER}:{plain_password}".encode()
#         ).hexdigest()

#         return hmac.compare_digest(
#             f"sha256${digest}",
#             hashed_password
#         )

#     return pwd_context.verify(
#         plain_password,
#         hashed_password
#     )


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password
    )

# ── Cấu hình JWT ─────────────────────────────────────────
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 giờ


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo JWT access token.
    `data` thường chứa {"sub": str(user.id)}.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Giải mã JWT token. Trả về payload nếu hợp lệ, None nếu lỗi/hết hạn.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
