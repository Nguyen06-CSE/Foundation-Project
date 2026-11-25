import os
import subprocess
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import CheckConstraint

from app.jobs.scheduler import (
    ADVISORY_LOCK_COMMUNITY_SUBJECT_STATS,
    refresh_community_subject_stats,
    register_jobs,
    scheduler,
)
from app.models.document import Document
from app.models.document_share import DocumentShare
from app.schemas.share import ShareStatus


def test_migration_chain_sole_head_and_revision_order():
    """Kiểm tra revision b3c4d5e6f7a8 là sole head và kế thừa trực tiếp a2b3c4d5e6f7."""
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"Kỳ vọng 1 head duy nhất nhưng nhận {heads}"
    assert heads[0] == "b3c4d5e6f7a8"

    rev = script.get_revision("b3c4d5e6f7a8")
    assert rev is not None
    assert rev.down_revision == "a2b3c4d5e6f7"


def test_offline_upgrade_sql_contains_sync_requirements():
    """Kiểm tra offline upgrade SQL sinh ra từ b3c4d5e6f7a8 chứa đầy đủ:
    1. Preflight status validation với RAISE EXCEPTION nếu có status bất thường.
    2. Cập nhật chk_document_shares_status với 6 giá trị bằng NOT VALID + VALIDATE.
    3. Tạo index ix_documents_bundle_parent_id.
    4. Tái tạo community_subject_stats với filter action = 'DOCUMENT_DOWNLOADED'.
    5. Tạo UNIQUE INDEX uq_community_subject_stats_subject_id cho concurrent refresh.
    """
    cmd = [
        "backend/.venv/bin/alembic",
        "upgrade",
        "--sql",
        "a2b3c4d5e6f7:b3c4d5e6f7a8",
    ]
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql+asyncpg://dummy:dummy@localhost:5432/dummy"
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=True,
        env=env,
    )
    sql = result.stdout

    # 1. Status preflight check
    assert "RAISE EXCEPTION" in sql
    assert "pending" in sql and "accepted" in sql and "rejected" in sql
    assert "auto_accepted" in sql and "expired" in sql and "withdrawn" in sql

    # 2. Constraint NOT VALID and VALIDATE
    assert "chk_document_shares_status" in sql
    assert "NOT VALID" in sql
    assert "VALIDATE CONSTRAINT" in sql

    # 3. Bundle parent id index
    assert "ix_documents_bundle_parent_id" in sql
    assert "documents (bundle_parent_id)" in sql

    # 4. Materialized view keeps the Live column list/types/formulas and only
    #    filters the download subquery by action.
    assert "community_subject_stats" in sql
    assert "action = 'DOCUMENT_DOWNLOADED'" in sql
    assert "count(DISTINCT d.id) AS document_count" in sql
    assert "COALESCE(sum(dl.download_count), 0::numeric) AS total_downloads" in sql
    assert "COALESCE(avg(dr.avg_stars), 0::numeric) AS avg_rating" in sql
    assert "count(*) AS download_count" in sql
    assert "ROUND(AVG" not in sql
    assert "::float AS avg_rating" not in sql
    assert "DROP MATERIALIZED VIEW IF EXISTS community_subject_stats CASCADE" not in sql

    # 5. Unique index for CONCURRENT refresh
    assert "uq_community_subject_stats_subject_id" in sql
    assert "UNIQUE INDEX" in sql

    # 6. Trigram dedupe preflight: only drop after catalog proof, otherwise NOTICE.
    assert "to_regclass('idx_document_title_trgm')" in sql
    assert "to_regclass('idx_documents_title_trgm')" in sql
    assert "indisvalid" in sql and "indisready" in sql
    assert "indnkeyatts" in sql and "indclass" in sql and "indoption" in sql
    assert "gin_trgm_ops" in sql
    assert "RAISE NOTICE" in sql
    assert "DROP INDEX idx_document_title_trgm" in sql
    assert "CREATE INDEX idx_documents_title_trgm" in sql
    assert "CREATE EXTENSION IF NOT EXISTS pg_trgm" in sql


def test_offline_downgrade_sql_contains_safe_rollback():
    """Kiểm tra offline downgrade SQL rollback an toàn:
    1. Giữ unique index uq_community_subject_stats_subject_id cho concurrent refresh.
    2. Recreate baseline community_subject_stats view (không filter action).
    3. Drop index ix_documents_bundle_parent_id.
    4. Preflight status check trước khi thu hẹp constraint về 3 giá trị ban đầu.
    """
    cmd = [
        "backend/.venv/bin/alembic",
        "downgrade",
        "--sql",
        "b3c4d5e6f7a8:a2b3c4d5e6f7",
    ]
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql+asyncpg://dummy:dummy@localhost:5432/dummy"
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=True,
        env=env,
    )
    sql = result.stdout

    assert "DROP INDEX IF EXISTS ix_documents_bundle_parent_id" in sql
    assert "community_subject_stats" in sql
    assert "action = 'DOCUMENT_DOWNLOADED'" not in sql
    assert "COALESCE(sum(dl.download_count), 0::numeric) AS total_downloads" in sql
    assert "COALESCE(avg(dr.avg_stars), 0::numeric) AS avg_rating" in sql
    assert "uq_community_subject_stats_subject_id" in sql
    assert "CREATE INDEX IF NOT EXISTS idx_document_title_trgm" in sql
    assert "DROP INDEX IF EXISTS idx_documents_title_trgm" not in sql
    assert "chk_document_shares_status" in sql
    assert "status NOT IN ('pending', 'accepted', 'auto_accepted')" in sql


def test_orm_models_alignment():
    """Kiểm tra model DocumentShare và Document đã khớp đúng schema:
    1. DocumentShare có chk_document_shares_status với đủ 6 giá trị.
    2. Document.bundle_parent_id có index=True.
    """
    # 1. DocumentShare table args
    table_args = DocumentShare.__table_args__
    check_constraints = [arg for arg in table_args if isinstance(arg, CheckConstraint)]
    status_chk = next((c for c in check_constraints if c.name == "chk_document_shares_status"), None)
    assert status_chk is not None, "DocumentShare thiếu CheckConstraint chk_document_shares_status"
    expected_statuses = {"pending", "accepted", "rejected", "auto_accepted", "expired", "withdrawn"}
    for st in expected_statuses:
        assert st in str(status_chk.sqltext)

    # 2. Document bundle_parent_id index
    col = Document.__table__.c.bundle_parent_id
    assert col.index is True


def test_share_status_types_and_defaults():
    """Kiểm tra 6 giá trị ShareStatus trong wire types và default của DocumentShare model."""
    allowed = {"pending", "accepted", "rejected", "auto_accepted", "expired", "withdrawn"}
    # ShareStatus type args
    args = set(ShareStatus.__args__)
    assert args == allowed

    # Default column value
    status_col = DocumentShare.__table__.c.status
    assert status_col.default.arg == "pending"


def _mock_engine_begin(mock_conn):
    mock_engine = MagicMock()
    begin_cm = MagicMock()
    begin_cm.__aenter__ = AsyncMock(return_value=mock_conn)
    begin_cm.__aexit__ = AsyncMock(return_value=None)
    mock_engine.begin.return_value = begin_cm
    return mock_engine, begin_cm


@pytest.mark.asyncio
async def test_refresh_community_subject_stats_acquires_lock_and_executes():
    """Kiểm tra scheduler job refresh_community_subject_stats:
    - Lấy transaction-level advisory lock trong cùng transaction
    - Thực thi REFRESH MATERIALIZED VIEW CONCURRENTLY
    - Không dùng session-level unlock thủ công.
    """
    mock_conn = AsyncMock()
    mock_conn.dialect.name = "postgresql"

    mock_lock_res = MagicMock()
    mock_lock_res.scalar.return_value = True
    mock_conn.execute = AsyncMock(return_value=mock_lock_res)

    mock_engine, _ = _mock_engine_begin(mock_conn)

    with patch("app.jobs.scheduler.engine", mock_engine):
        success = await refresh_community_subject_stats()
        assert success is True

        assert mock_conn.execute.call_count == 2
        executed_stmts = [str(c[0][0]) for c in mock_conn.execute.call_args_list]
        assert "pg_try_advisory_xact_lock" in executed_stmts[0]
        assert "REFRESH MATERIALIZED VIEW CONCURRENTLY community_subject_stats" in executed_stmts[1]
        assert not any("pg_advisory_unlock" in s for s in executed_stmts)
        mock_engine.begin.assert_called_once()


@pytest.mark.asyncio
async def test_refresh_community_subject_stats_skips_when_lock_held():
    """Kiểm tra khi advisory lock đang bị process khác giữ thì bỏ qua (skip), không refresh."""
    mock_conn = AsyncMock()
    mock_conn.dialect.name = "postgresql"

    mock_lock_res = MagicMock()
    mock_lock_res.scalar.return_value = False
    mock_conn.execute = AsyncMock(return_value=mock_lock_res)

    mock_engine, _ = _mock_engine_begin(mock_conn)

    with patch("app.jobs.scheduler.engine", mock_engine):
        success = await refresh_community_subject_stats()
        assert success is False

        assert mock_conn.execute.call_count == 1
        executed_stmt = str(mock_conn.execute.call_args_list[0][0][0])
        assert "pg_try_advisory_xact_lock" in executed_stmt


@pytest.mark.asyncio
async def test_refresh_community_subject_stats_releases_lock_on_error():
    """Khi REFRESH lỗi, transaction rollback tự nhả xact lock; không có unlock thủ công."""
    mock_conn = AsyncMock()
    mock_conn.dialect.name = "postgresql"

    mock_lock_res = MagicMock()
    mock_lock_res.scalar.return_value = True

    async def mock_exec(stmt, *args, **kwargs):
        stmt_str = str(stmt)
        if "pg_try_advisory_xact_lock" in stmt_str:
            return mock_lock_res
        if "REFRESH MATERIALIZED VIEW" in stmt_str:
            raise RuntimeError("Database connection lost")
        return MagicMock()

    mock_conn.execute = AsyncMock(side_effect=mock_exec)

    mock_engine, begin_cm = _mock_engine_begin(mock_conn)

    with patch("app.jobs.scheduler.engine", mock_engine):
        with pytest.raises(RuntimeError, match="Database connection lost"):
            await refresh_community_subject_stats()

        executed_stmts = [str(c[0][0]) for c in mock_conn.execute.call_args_list]
        assert not any("pg_advisory_unlock" in s for s in executed_stmts)
        assert begin_cm.__aexit__.await_count == 1
        assert begin_cm.__aexit__.call_args[0][0] is RuntimeError
        assert isinstance(begin_cm.__aexit__.call_args[0][1], RuntimeError)


def test_scheduler_job_registration():
    """Kiểm tra register_jobs() đăng ký refresh_community_subject_stats mỗi giờ."""
    register_jobs()
    job = scheduler.get_job("refresh_community_subject_stats")
    assert job is not None
    assert str(job.trigger) == "cron[minute='0']"
