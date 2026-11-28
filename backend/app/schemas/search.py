from __future__ import annotations

from typing import List, Optional, Any, Literal
from pydantic import BaseModel, Field

MatchField = Literal["title", "content", "semantic"]


class SearchMatchProvenance(BaseModel):
    methods: list[Literal["lexical_title", "lexical_content", "semantic"]]
    title_rank: Optional[int] = None
    content_rank: Optional[int] = None
    semantic_rank: Optional[int] = None
    fused_score: Optional[float] = None


class SearchResultItem(BaseModel):
    id: int
    type: str  # 'personal_doc', 'group_doc', 'workspace', 'personal_folder', 'group_folder'
    title: str
    subtitle: str
    url: str
    snippet: Optional[str] = None
    citation: Optional[dict[str, Any]] = None
    match: Optional[SearchMatchProvenance] = None


class QuickSearchOut(BaseModel):
    items: List[SearchResultItem]


class FullSearchOut(BaseModel):
    items: List[SearchResultItem]
    total: int
    page: int
    page_size: int
    fallback: bool = False
    unavailable_match_fields: list[MatchField] = Field(default_factory=list)
