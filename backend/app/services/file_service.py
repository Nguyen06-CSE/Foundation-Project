from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.utils.checksum import compute_file_checksum

STORAGE_DIR = Path("storage")


def save_upload_file(upload: UploadFile, owner_id: int) -> str:
    owner_dir = STORAGE_DIR / str(owner_id)
    owner_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(upload.filename or "upload.bin").suffix
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    dest_path = owner_dir / safe_name
    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)
    return str(dest_path)


def checksum_for_file(file_path: str) -> str:
    return compute_file_checksum(file_path)
