# app/core/config.py
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),  # trỏ đúng về file .env ở gốc dự án
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()