import asyncio

from sqlalchemy import text

from app.core.database import engine
from app.models.base import Base

# Import models so SQLAlchemy metadata knows every table.
from app.models import (  # noqa: F401
    academic_class,
    category,
    document,
    document_share,
    document_tag,
    document_version,
    download_log,
    faculty,
    favorite,
    folder,
    folder_tag,
    note,
    notification,
    processing_job,
    tag,
    trash_batch,
    user,
    workspace,
    workspace_invitation,
    workspace_member,
)


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        statements = [
            "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_dissolving BOOLEAN DEFAULT false",
            "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS dissolve_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS message VARCHAR(500)",
            "ALTER TABLE folders ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE",
            "CREATE INDEX IF NOT EXISTS ix_folders_workspace_id ON folders(workspace_id)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT false",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS orphaned_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS trash_source VARCHAR(30)",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS trash_group_name VARCHAR(150)",
        ]
        for statement in statements:
            await conn.execute(text(statement))


if __name__ == "__main__":
    asyncio.run(main())
