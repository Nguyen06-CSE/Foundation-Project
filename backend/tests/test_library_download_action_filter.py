import pytest
import pytest_asyncio
from fastapi import BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.models.download_log import DownloadLog
from app.models.tag import Tag
from app.models.workspace_tag import WorkspaceTag
from app.routers.library import get_community_document, get_documents_by_subject
from app.constants.activity_actions import ActivityAction


@pytest_asyncio.fixture
async def db_session():
    test_engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    )
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        from sqlalchemy import text
        await session.execute(text("DEALLOCATE ALL"))
        yield session
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_batch1_tag_39_and_library_download_filter(db_session):
    """Kiểm tra tổng hợp Batch 1: Tag 39 & Library Download Count Action Filter."""
    # 1. Tag 39 & WorkspaceTags Consistency
    t39 = (await db_session.execute(select(Tag).where(Tag.id == 39))).scalar_one_or_none()
    assert t39 is not None, "Tag 39 phải tồn tại"
    assert t39.workspace_id is None, "Tag 39 legacy workspace_id phải là NULL sau migration"

    legacy_count = (await db_session.execute(select(func.count(Tag.id)).where(Tag.workspace_id.is_not(None)))).scalar()
    assert legacy_count == 0, "Không còn tag nào chứa legacy workspace_id"

    wt = (await db_session.execute(
        select(WorkspaceTag).where(WorkspaceTag.workspace_id == 10, WorkspaceTag.tag_id == 39)
    )).scalar_one_or_none()
    assert wt is not None, "Tag 39 phải được map trong workspace_tags với workspace 10"
    assert wt.owner_user_id == 6, "Owner user của workspace_tag phải là 6"

    # 2. Library Download Count Filter: verify on doc 50 (has 4 views + 1 save, 0 downloads)
    bg = BackgroundTasks()
    doc50 = await get_community_document(
        document_id=50,
        background_tasks=bg,
        db=db_session,
        current_user=None,
    )
    assert doc50 is not None
    # Đếm số lượng action download thực tế của doc 50
    actual_downloads = (await db_session.execute(
        select(func.count(DownloadLog.id)).where(
            DownloadLog.document_id == 50,
            DownloadLog.action.in_([ActivityAction.DOWNLOADED, "download"])
        )
    )).scalar() or 0
    assert doc50.download_count == 0
    assert doc50.download_count == actual_downloads

    # Kiểm tra danh sách tài liệu theo môn học (subject 19 chứa doc 50)
    subject_docs = await get_documents_by_subject(
        subject_id=19,
        page=1,
        page_size=10,
        sort="newest",
        db=db_session,
    )
    d50_in_list = next((d for d in subject_docs.items if d.id == 50), None)
    assert d50_in_list is not None
    assert d50_in_list.download_count == 0, "Doc 50 trong subject list phải có download_count = 0"
