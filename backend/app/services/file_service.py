# backend/app/services/file_service.py
from __future__ import annotations

import io
import uuid
from pathlib import Path
from fastapi import UploadFile

from app.core.config import settings, s3_client
from app.utils.checksum import compute_file_checksum


def save_upload_file(upload: UploadFile, owner_id: int) -> str:
    """
    Upload file trực tiếp lên Cloudflare R2 và trả về file_key (VD: storage/6/uuid.docx)
    """
    suffix = Path(upload.filename or "upload.bin").suffix
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    file_key = f"storage/{owner_id}/{safe_name}"

    # Đọc dữ liệu binary từ UploadFile
    content = upload.file.read()

    # Upload trực tiếp lên Cloudflare R2 qua boto3
    s3_client.put_object(
        Bucket=settings.BUCKET_NAME,
        Key=file_key,
        Body=content,
        ContentType=upload.content_type or "application/octet-stream"
    )

    # Reset con trỏ file về đầu
    upload.file.seek(0)

    return file_key


def checksum_for_file(file_input: str | bytes | UploadFile) -> str:
    """
    Tính checksum MD5/SHA256 mà không đọc đĩa local.
    """
    if isinstance(file_input, UploadFile):
        content = file_input.file.read()
        file_input.file.seek(0)
        return compute_file_checksum(io.BytesIO(content))
    elif isinstance(file_input, bytes):
        return compute_file_checksum(io.BytesIO(file_input))
    else:
        return compute_file_checksum(file_input)


def get_file_url(file_key: str | None) -> str | None:
    """
    Helper chuyển file_key tương đối thành Full URL R2 để gửi về Frontend.
    """
    if not file_key:
        return None
    if file_key.startswith("http://") or file_key.startswith("https://"):
        return file_key
    if settings.MINIO_PUBLIC_URL:
        return f"{settings.MINIO_PUBLIC_URL.rstrip('/')}/{file_key.lstrip('/')}"
    return file_key