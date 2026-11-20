from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    id: int
    type: str  # 'personal_doc', 'group_doc', 'workspace', 'personal_folder', 'group_folder'
    title: str
    subtitle: str
    url: str
    snippet: Optional[str] = None


class QuickSearchOut(BaseModel):
    items: List[SearchResultItem]


class FullSearchOut(BaseModel):
    items: List[SearchResultItem]
    total: int
    page: int
    page_size: int
