from __future__ import annotations

import io
import uuid
from pathlib import Path
from fastapi import UploadFile

from app.core.config import settings, s3_client
from app.utils.checksum import compute_file_checksum


async def save_upload_file(upload: UploadFile, owner_id: int) -> str:
    """
    Upload file trực tiếp lên Cloudflare R2 bất đồng bộ và trả về file_key (VD: storage/6/uuid.docx)
    """
    suffix = Path(upload.filename or "upload.bin").suffix
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    file_key = f"storage/{owner_id}/{safe_name}"

    # Đọc dữ liệu binary bất đồng bộ
    content = await upload.read()
    await upload.seek(0)

    # Đẩy lên Cloudflare R2 với ContentType và ContentDisposition chuẩn
    s3_client.put_object(
        Bucket=settings.BUCKET_NAME,
        Key=file_key,
        Body=content,
        ContentType=upload.content_type or "application/octet-stream",
        ContentDisposition=f'inline; filename="{upload.filename}"'
    )

    return file_key


def checksum_for_file(file_input: str | bytes | UploadFile) -> str:
    """
    Tính checksum MD5/SHA256 không cần ghi ổ đĩa local.
    """
    if isinstance(file_input, bytes):
        return compute_file_checksum(io.BytesIO(file_input))
    elif isinstance(file_input, UploadFile):
        # Lưu ý: nếu truyền UploadFile vào đây, đảm bảo đã read() hoặc dùng file.read()
        content = file_input.file.read()
        file_input.file.seek(0)
        return compute_file_checksum(io.BytesIO(content))
    else:
        return compute_file_checksum(file_input)


def get_file_url(file_key: str | None) -> str | None:
    """
    Helper chuẩn hóa file_key thành Full R2 Public URL gửi về Frontend.
    """
    if not file_key:
        return None
    if file_key.startswith("http://") or file_key.startswith("https://") or file_key.startswith("data:"):
        return file_key
    if settings.MINIO_PUBLIC_URL:
        clean_key = file_key.lstrip('/')
        return f"{settings.MINIO_PUBLIC_URL.rstrip('/')}/{clean_key}"
    return file_key