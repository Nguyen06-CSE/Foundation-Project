# backend/tests/test_permission_normalization.py

import pytest
from pydantic import ValidationError
from sqlalchemy import text, Table, Column, Integer, String, CheckConstraint, MetaData
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.schemas.group import PermissionUpdate, GroupCreate
from app.services.group_service import require_write_permission
from app.models.workspace import Workspace


def test_permission_schema_strict_view_full():
    """Verify Pydantic schema accepts only 'view' and 'full'."""
    p_view = PermissionUpdate(permission_level="view")
    assert p_view.permission_level == "view"

    p_full = PermissionUpdate(permission_level="full")
    assert p_full.permission_level == "full"

    # 'edit', 'write', 'admin' must be rejected
    for invalid in ["edit", "write", "admin", "owner", "member", ""]:
        with pytest.raises(ValidationError):
            PermissionUpdate(permission_level=invalid)


def test_group_create_default_permission():
    """Verify GroupCreate defaults to 'view' and accepts 'full', rejects others."""
    g = GroupCreate(name="Test Group")
    assert g.default_member_permission == "view"

    g2 = GroupCreate(name="Test Group 2", default_member_permission="full")
    assert g2.default_member_permission == "full"

    with pytest.raises(ValidationError):
        GroupCreate(name="Invalid Group", default_member_permission="edit")


@pytest.mark.asyncio
async def test_disposable_db_chk_workspace_members_permission():
    """
    Verify permission constraint in a 100% disposable in-memory test database.
    NEVER touches the live Neon database.
    """
    disposable_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    # Ensure this is strictly an in-memory disposable SQLite engine
    assert "sqlite" in disposable_engine.url.drivername
    assert disposable_engine.url.database == ":memory:"

    metadata = MetaData()
    workspace_members = Table(
        "workspace_members",
        metadata,
        Column("workspace_id", Integer, primary_key=True),
        Column("user_id", Integer, primary_key=True),
        Column("permission_level", String(10), nullable=False),
        CheckConstraint(
            "permission_level IN ('view', 'full')",
            name="chk_workspace_members_permission"
        ),
    )

    async with disposable_engine.begin() as conn:
        await conn.run_sync(metadata.create_all)

    session_maker = async_sessionmaker(disposable_engine, expire_on_commit=False, class_=AsyncSession)

    async with session_maker() as session:
        # 1. Valid permission values 'view' and 'full' must succeed
        await session.execute(
            workspace_members.insert().values(workspace_id=1, user_id=10, permission_level="view")
        )
        await session.execute(
            workspace_members.insert().values(workspace_id=1, user_id=11, permission_level="full")
        )
        await session.commit()

        # 2. Invalid 'edit' must fail with IntegrityError
        with pytest.raises(IntegrityError):
            await session.execute(
                workspace_members.insert().values(workspace_id=1, user_id=12, permission_level="edit")
            )
            await session.commit()
        await session.rollback()

        # 3. Invalid 'admin' must fail with IntegrityError
        with pytest.raises(IntegrityError):
            await session.execute(
                workspace_members.insert().values(workspace_id=1, user_id=13, permission_level="admin")
            )
            await session.commit()
        await session.rollback()

        # 4. Invalid 'write' must fail with IntegrityError
        with pytest.raises(IntegrityError):
            await session.execute(
                workspace_members.insert().values(workspace_id=1, user_id=14, permission_level="write")
            )
            await session.commit()
        await session.rollback()

    await disposable_engine.dispose()


@pytest.mark.asyncio
async def test_require_write_permission_logic(monkeypatch):
    """Verify require_write_permission allows owner and 'full', rejects 'view'."""
    fake_workspace = Workspace(id=999, owner_id=1, is_deleted=False, type="group")

    class MockSession:
        async def get(self, model, id):
            return fake_workspace

    async def mock_require_member_view(db, workspace_id, user_id):
        return "view"

    async def mock_require_member_full(db, workspace_id, user_id):
        return "full"

    mock_db = MockSession()

    # User 2 (not owner) with 'view' permission -> 403
    import app.services.group_service as gs
    monkeypatch.setattr(gs, "require_member", mock_require_member_view)
    with pytest.raises(HTTPException) as exc_info:
        await require_write_permission(mock_db, 999, user_id=2)
    assert exc_info.value.status_code == 403

    # User 2 with 'full' permission -> passes
    monkeypatch.setattr(gs, "require_member", mock_require_member_full)
    await require_write_permission(mock_db, 999, user_id=2)

    # User 1 (owner) even with 'view' perm -> passes
    monkeypatch.setattr(gs, "require_member", mock_require_member_view)
    await require_write_permission(mock_db, 999, user_id=1)
