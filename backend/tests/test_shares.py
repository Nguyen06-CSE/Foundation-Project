import pytest
from app.core.roles import role_rank, is_auto_accept
from app.schemas.share import ShareCreate, SharePreviewOut, PredictedUser

def test_role_ranking():
    assert role_rank("student") == 1
    assert role_rank("teacher") == 2
    assert role_rank("faculty_admin") == 3
    assert role_rank("school_admin") == 4
    assert role_rank("system_admin") == 4
    assert role_rank("sysadmin") == 4
    assert role_rank(None) == 0

def test_is_auto_accept_routing():
    # Cấp bậc cao hơn gửi cấp bậc thấp hơn -> Tự động nhận
    assert is_auto_accept("teacher", "student") is True
    assert is_auto_accept("faculty_admin", "teacher") is True
    assert is_auto_accept("system_admin", "student") is True

    # Cấp bậc bằng nhau -> Chờ xác nhận
    assert is_auto_accept("student", "student") is False
    assert is_auto_accept("teacher", "teacher") is False
    assert is_auto_accept("system_admin", "school_admin") is False

    # Cấp bậc thấp hơn gửi cấp bậc cao hơn -> Chờ xác nhận
    assert is_auto_accept("student", "teacher") is False
    assert is_auto_accept("student", "faculty_admin") is False
    assert is_auto_accept("teacher", "school_admin") is False

def test_share_create_schema_validation():
    payload = ShareCreate(
        document_ids=[1, 2],
        identifiers=["user1", "user2@email.com"],
        message="Vui lòng tham khảo tài liệu",
    )
    assert payload.document_ids == [1, 2]
    assert payload.identifiers == ["user1", "user2@email.com"]
    assert payload.confirm_bulk is False

    # Document IDs không được rỗng
    with pytest.raises(Exception):
        ShareCreate(document_ids=[])

def test_share_preview_output_schema():
    preview = SharePreviewOut(
        users=[
            PredictedUser(
                id=1,
                username="sv1",
                role="student",
                status="auto",
                reason="Auto accept",
            ),
            PredictedUser(
                id=2,
                username="gv1",
                role="teacher",
                status="pending",
                reason="Pending approval",
            ),
        ],
        auto_count=1,
        pending_count=1,
        duplicate_count=0,
        requires_bulk_confirm=False,
    )
    assert preview.auto_count == 1
    assert preview.pending_count == 1
    assert len(preview.users) == 2


def test_share_activity_actions_and_metadata_schema():
    from app.constants.activity_actions import ActivityAction
    from app.schemas.document import DocumentOut
    from datetime import datetime, timezone

    assert ActivityAction.SHARED == "DOCUMENT_SHARED"
    assert ActivityAction.RECEIVED == "DOCUMENT_RECEIVED"

    now = datetime.now(timezone.utc)
    doc_out = DocumentOut(
        id=10,
        owner_id=2,
        title="Test Shared Doc",
        file_path="storage/files/test.pdf",
        checksum="abc123checksum",
        created_at=now,
        metadata_={
            "shared_by": {
                "id": 1,
                "username": "teacher1",
                "full_name": "Giảng Viên A",
                "role": "teacher",
            },
            "shared_at": now.isoformat(),
        },
    )
    dumped = doc_out.model_dump(by_alias=True)
    assert "metadata" in dumped
    assert dumped["metadata"]["shared_by"]["username"] == "teacher1"

    # Kiểm tra normalize_metadata khi DB trả về list do nối JSON 'null'::jsonb
    doc_corrupted = DocumentOut(
        id=11,
        owner_id=2,
        title="Corrupted Meta Doc",
        file_path="storage/files/test.pdf",
        checksum="abc123checksum",
        created_at=now,
        metadata_=[None, {"is_shared": True}],
    )
    assert doc_corrupted.metadata_ == {"is_shared": True}


def test_share_partial_unique_index_metadata():
    from app.models.document_share import DocumentShare
    from sqlalchemy import Index

    table_args = DocumentShare.__table_args__
    index_names = [arg.name for arg in table_args if isinstance(arg, Index)]

    assert "uq_document_share_pending" in index_names
    pending_idx = next(arg for arg in table_args if isinstance(arg, Index) and arg.name == "uq_document_share_pending")
    assert pending_idx.unique is True
    # Kiểm tra các cột trong Partial Unique Index
    col_names = [col.name for col in pending_idx.columns]
    assert col_names == ["from_user_id", "to_user_id", "source_document_id"]


def test_share_create_and_status_schemas():
    from app.schemas.share import DocumentShareStatusOut, ShareCreateOut, ShareRecipientResult

    status_out = DocumentShareStatusOut(
        pending_user_ids=[2, 3],
        owned_user_ids=[4],
        pending_shares=[{"user_id": 2, "document_id": 10, "share_id": 5}],
    )
    assert status_out.pending_user_ids == [2, 3]
    assert status_out.owned_user_ids == [4]
    assert len(status_out.pending_shares) == 1

    create_out = ShareCreateOut(
        message="Đã xử lý chia sẻ",
        auto_accepted_count=0,
        pending_count=1,
        already_pending_count=1,
        already_owned_count=0,
        skipped_duplicates_count=1,
        results=[
            ShareRecipientResult(
                user_id=2,
                username="sv_an",
                document_id=10,
                status="already_pending",
                share_id=5,
            )
        ],
    )
    assert create_out.already_pending_count == 1
    assert create_out.results[0].status == "already_pending"
    assert create_out.results[0].share_id == 5



