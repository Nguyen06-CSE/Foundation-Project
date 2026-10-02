# backend/app/schemas/favorite.py
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

ReadingStatus = Literal["to_read", "reading", "completed"]


class FavoriteTagOut(BaseModel):
    id: int
    name: str
    color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FavoriteTagWithCountOut(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    document_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FavoriteTagAdd(BaseModel):
    tag_id: Optional[int] = None
    name: Optional[str] = Field(None, max_length=128)


class FavoriteCreate(BaseModel):
    document_id: int
    reading_status: ReadingStatus = "to_read"
    notes: Optional[str] = Field(None, max_length=5000)
    tag_ids: Optional[list[int]] = None


class FavoriteUpdate(BaseModel):
    reading_status: Optional[ReadingStatus] = None
    notes: Optional[str] = Field(None, max_length=5000)
    tag_ids: Optional[list[int]] = None


class FavoriteOut(BaseModel):
    user_id: int
    document_id: int
    created_at: Optional[datetime] = None
    reading_status: ReadingStatus = "to_read"
    notes: Optional[str] = None
    tags: list[FavoriteTagOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FavoriteDocumentOwnerOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FavoriteDocumentSummaryOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    owner_id: Optional[int] = None
    owner: Optional[FavoriteDocumentOwnerOut] = None
    is_important: bool = False
    is_bundle: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Favorite specific fields
    favorited_at: datetime
    reading_status: ReadingStatus = "to_read"
    notes: Optional[str] = None
    tags: list[FavoriteTagOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FavoriteListOut(BaseModel):
    items: list[FavoriteDocumentSummaryOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class FavoriteStatsOut(BaseModel):
    total: int
    to_read: int
    reading: int
    completed: int
