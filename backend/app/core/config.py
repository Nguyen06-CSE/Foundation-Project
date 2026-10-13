# app/core/config.py
from typing import Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
import boto3

# Tính toán đường dẫn gốc của dự án
# config.py -> core (1) -> app (2) -> backend (3) -> Foundation-Project (4)
ROOT_DIR = Path(__file__).resolve().parents[3]
ENV_PATH = ROOT_DIR / ".env"

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str

    # --- Các biến cấu hình Storage ---
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_PUBLIC_URL: Optional[str] = None
    BUCKET_NAME: Optional[str] = "elibrary-bucket"

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

s3_client = boto3.client(
    's3',
    endpoint_url=settings.MINIO_ENDPOINT,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
    region_name='auto'  # Chuẩn với Cloudflare R2
)