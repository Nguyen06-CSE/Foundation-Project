from datetime import datetime, timedelta, timezone
import pytest
from pydantic import ValidationError

from app.core.roles import norm_role, is_admin, is_global_admin
from app.schemas.todo import TodoCreate
from app.schemas.library import BulkSubmissionCreate


def test_role_normalization_and_admin_checks():
    assert norm_role("sysadmin") == "system_admin"
    assert norm_role("schooladmin") == "school_admin"
    assert norm_role("faculty_admin") == "faculty_admin"

    assert is_admin("system_admin") is True
    assert is_admin("school_admin") is True
    assert is_admin("faculty_admin") is True
    assert is_admin("sysadmin") is True
    assert is_admin("student") is False
    assert is_admin(None) is False

    assert is_global_admin("system_admin") is True
    assert is_global_admin("school_admin") is True
    assert is_global_admin("faculty_admin") is False


def test_todo_create_time_validation():
    now = datetime.now(timezone.utc)
    later = now + timedelta(hours=2)

    valid_todo = TodoCreate(
        title="Đọc giáo trình Giải tích",
        task_type="read_doc",
        start_at=now,
        due_at=later,
    )
    assert valid_todo.title == "Đọc giáo trình Giải tích"

    with pytest.raises(ValidationError):
        TodoCreate(
            title="Lỗi khung giờ",
            task_type="custom",
            start_at=later,
            due_at=now,
        )


def test_bulk_submission_schema():
    payload = BulkSubmissionCreate(
        source_document_ids=[1, 2, 3],
        subject_id=10,
        doc_type="Giáo trình",
        academic_year="2024-2025",
    )
    assert len(payload.source_document_ids) == 3
    assert payload.subject_id == 10
