"""add_document_share_partial_unique_index

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-11-06 14:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("CREATE TABLE IF NOT EXISTS document_shares (id SERIAL PRIMARY KEY)")
    op.execute("ALTER TABLE document_shares ALTER COLUMN document_id DROP NOT NULL")
    op.execute("ALTER TABLE document_shares ALTER COLUMN source_document_id DROP NOT NULL")
    op.execute("ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS source_workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE")
    op.execute("ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'")
    op.execute("ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS message VARCHAR(500)")
    op.execute("ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE")

    op.execute("CREATE INDEX IF NOT EXISTS ix_document_shares_to_user_status ON document_shares(to_user_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_document_shares_from_user_status ON document_shares(from_user_id, status)")
    op.execute("DROP INDEX IF EXISTS uq_document_shares_pending")
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_document_share_pending
        ON document_shares (from_user_id, to_user_id, source_document_id)
        WHERE status = 'pending' AND source_document_id IS NOT NULL
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_documents_source_owner
        ON documents (source_document_id, owner_id)
        WHERE is_deleted = false AND source_document_id IS NOT NULL
    """)

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_documents_source_owner")
    op.execute("DROP INDEX IF EXISTS uq_document_share_pending")
    op.execute("DROP INDEX IF EXISTS ix_document_shares_from_user_status")
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_document_shares_pending
        ON document_shares (source_document_id, to_user_id)
        WHERE status = 'pending'
    """)
