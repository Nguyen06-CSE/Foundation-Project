from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    note: Optional[str] = None
    task_type: str = Field(default="custom", max_length=30)
    document_id: Optional[int] = None
    workspace_id: Optional[int] = None
    start_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    priority: str = Field(default="normal", max_length=10)
    remind_before_minutes: Optional[int] = 30

    @model_validator(mode="after")
    def check_dates(self):
        if self.start_at and self.due_at and self.due_at < self.start_at:
            raise ValueError("Hạn chót (due_at) phải lớn hơn hoặc bằng giờ bắt đầu (start_at)")
        return self


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    note: Optional[str] = None
    task_type: Optional[str] = Field(default=None, max_length=30)
    document_id: Optional[int] = None
    workspace_id: Optional[int] = None
    start_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    priority: Optional[str] = Field(default=None, max_length=10)
    remind_before_minutes: Optional[int] = None
    is_completed: Optional[bool] = None


class TodoOut(BaseModel):
    id: int
    user_id: int
    title: str
    note: Optional[str] = None
    task_type: str
    document_id: Optional[int] = None
    document_title: Optional[str] = None
    workspace_id: Optional[int] = None
    workspace_name: Optional[str] = None
    start_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    priority: str = "normal"
    remind_before_minutes: Optional[int] = None
    completed_at: Optional[datetime] = None
    is_completed: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
