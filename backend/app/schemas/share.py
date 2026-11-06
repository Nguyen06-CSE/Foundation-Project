from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.document import DocumentOut

ShareStatus = Literal["pending", "accepted", "rejected", "auto_accepted", "expired", "withdrawn"]

class ShareCreate(BaseModel):
    document_ids: List[int] = Field(..., min_length=1)
    source_workspace_id: Optional[int] = None
    identifiers: List[str] = []
    class_ids: List[int] = []
    faculty_ids: List[int] = []
    student_code_patterns: List[str] = []
    message: Optional[str] = Field(default=None, max_length=500)
    confirm_bulk: bool = False

class PredictedUser(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role: str
    status: Literal["auto", "pending", "already_pending", "already_owned", "duplicate"]
    reason: Optional[str] = None
    share_id: Optional[int] = None

class SharePreviewOut(BaseModel):
    users: List[PredictedUser]
    auto_count: int
    pending_count: int
    already_pending_count: int = 0
    already_owned_count: int = 0
    duplicate_count: int
    requires_bulk_confirm: bool

class ShareRecipientResult(BaseModel):
    user_id: int
    username: str
    full_name: Optional[str] = None
    document_id: int
    status: Literal["created", "auto_accepted", "already_pending", "already_owned"]
    share_id: Optional[int] = None

class ShareCreateOut(BaseModel):
    message: str
    auto_accepted_count: int
    pending_count: int
    already_pending_count: int = 0
    already_owned_count: int = 0
    skipped_duplicates_count: int
    results: List[ShareRecipientResult] = []

class DocumentShareStatusOut(BaseModel):
    pending_user_ids: List[int] = []
    owned_user_ids: List[int] = []
    pending_shares: List[dict] = []

class UserMini(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role: str
    model_config = ConfigDict(from_attributes=True)

class DocumentShareOut(BaseModel):
    id: int
    source_document_id: Optional[int] = None
    document_id: Optional[int] = None
    from_user: UserMini
    to_user: UserMini
    share_type: str
    status: str
    message: Optional[str] = None
    expires_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    document: Optional[DocumentOut] = None
    source_document: Optional[DocumentOut] = None

    model_config = ConfigDict(from_attributes=True)
