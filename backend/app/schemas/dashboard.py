# backend/app/schemas/dashboard.py

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RejectedSubmissionBrief(BaseModel):
    submission_id: int
    title: str
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ContributionStats(BaseModel):
    total: int = 0
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    approved_downloads: int = 0


class RecentGroupItem(BaseModel):
    id: int
    name: str
    role: str
    member_count: int = 0
    document_count: int = 0
    updated_at: Optional[datetime] = None


class GroupStats(BaseModel):
    total: int = 0
    owned: int = 0
    total_docs: int = 0
    recent: List[RecentGroupItem] = Field(default_factory=list)


class RecentViewedDocument(BaseModel):
    id: int
    title: str
    file_type: Optional[str] = None
    is_bundle: bool = False
    children_count: int = 0
    thumbnail_path: Optional[str] = None
    last_viewed_at: Optional[datetime] = None


class RecentActivityItem(BaseModel):
    id: int
    action: str
    document_id: int
    document_title: Optional[str] = None
    created_at: datetime


class DashboardSummaryOut(BaseModel):
    pending_invitations: int = 0
    pending_invitation_names: List[str] = Field(default_factory=list)
    rejected_recent_count: int = 0
    latest_rejected: Optional[RejectedSubmissionBrief] = None
    expiring_trash_count: int = 0
    total_docs: int = 0
    new_docs_7d: int = 0
    storage_used_bytes: int = 0
    storage_quota_bytes: int = 0
    shared_docs_count: int = 0
    favorite_count: int = 0
    contributions: ContributionStats = Field(default_factory=ContributionStats)
    groups: GroupStats = Field(default_factory=GroupStats)
    recent_viewed: List[RecentViewedDocument] = Field(default_factory=list)
    recent_activities: List[RecentActivityItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
