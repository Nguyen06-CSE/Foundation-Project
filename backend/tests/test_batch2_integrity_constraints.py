import pytest
import pytest_asyncio
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.document import Document
from app.models.notification import Notification
from app.models.download_log import DownloadLog


@pytest_asyncio.fixture
async def db_session():
    test_engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    )
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_batch2_booleans_and_timestamps(db_session):
    """Kiểm tra các cột boolean NOT NULL và timestamp TIMESTAMPTZ."""
    b_cols = await db_session.execute(text("""
        SELECT table_name, column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE (table_name = 'documents' AND column_name IN ('is_deleted', 'is_important'))
           OR (table_name = 'notifications' AND column_name = 'is_read')
        ORDER BY table_name, column_name;
    """))
    for row in b_cols.all():
        assert row[2] == "NO", f"{row[0]}.{row[1]} phải là NOT NULL"
        assert "false" in str(row[3]).lower(), f"{row[0]}.{row[1]} phải có default false"

    # Kiểm tra documents.deleted_at là TIMESTAMPTZ
    ts = await db_session.execute(text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'deleted_at';
    """))
    assert ts.scalar() == "timestamp with time zone"


@pytest.mark.asyncio
async def test_batch2_check_constraints_and_fks(db_session):
    """Kiểm tra các ràng buộc CHECK và chính sách FK delete."""
    # Kiểm tra CHECK constraints tồn tại
    chks = await db_session.execute(text("""
        SELECT conname FROM pg_constraint
        WHERE contype = 'c' AND conname IN (
            'chk_documents_scope',
            'chk_workspaces_type',
            'chk_document_shares_status',
            'chk_download_logs_action'
        );
    """))
    found = {r[0] for r in chks.all()}
    assert found == {
        "chk_documents_scope",
        "chk_workspaces_type",
        "chk_document_shares_status",
        "chk_download_logs_action",
    }

    # Kiểm tra FK delete policies
    fks = await db_session.execute(text("""
        SELECT conname, confdeltype FROM pg_constraint
        WHERE conname IN (
            'document_shares_source_document_id_fkey',
            'document_shares_document_id_fkey',
            'community_submissions_subject_id_fkey'
        );
    """))
    fk_dict = {r[0]: r[1] for r in fks.all()}
    assert fk_dict["document_shares_source_document_id_fkey"] == b"n"  # SET NULL
    assert fk_dict["document_shares_document_id_fkey"] == b"n"         # SET NULL
    assert fk_dict["community_submissions_subject_id_fkey"] == b"c"   # CASCADE

    # Kiểm tra toàn bộ 48 legacy 'view' action đã được chuẩn hóa về 'DOCUMENT_VIEWED'
    legacy_views = await db_session.execute(text("SELECT count(*) FROM download_logs WHERE action = 'view';"))
    assert legacy_views.scalar() == 0
