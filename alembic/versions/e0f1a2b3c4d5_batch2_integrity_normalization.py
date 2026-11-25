"""batch2_integrity_normalization

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-11-23 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'e0f1a2b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Nullable booleans: Chuẩn hoá các cờ boolean về NOT NULL DEFAULT false
    op.execute("UPDATE documents SET is_deleted = false WHERE is_deleted IS NULL;")
    op.execute("UPDATE documents SET is_important = false WHERE is_important IS NULL;")
    op.execute("UPDATE notifications SET is_read = false WHERE is_read IS NULL;")

    op.execute("ALTER TABLE documents ALTER COLUMN is_deleted SET DEFAULT false;")
    op.execute("ALTER TABLE documents ALTER COLUMN is_deleted SET NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN is_important SET DEFAULT false;")
    op.execute("ALTER TABLE documents ALTER COLUMN is_important SET NOT NULL;")

    op.execute("ALTER TABLE notifications ALTER COLUMN is_read SET DEFAULT false;")
    op.execute("ALTER TABLE notifications ALTER COLUMN is_read SET NOT NULL;")

    # 2. Timestamps: Chuẩn hoá documents.deleted_at sang TIMESTAMPTZ đồng bộ với toàn DB
    op.execute("ALTER TABLE documents ALTER COLUMN deleted_at TYPE TIMESTAMP WITH TIME ZONE;")

    # 3. FK Delete Policies: Khắc phục drift giữa ORM và DB
    op.execute("ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS document_shares_source_document_id_fkey;")
    op.execute("ALTER TABLE document_shares ADD CONSTRAINT document_shares_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;")

    op.execute("ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS document_shares_document_id_fkey;")
    op.execute("ALTER TABLE document_shares ADD CONSTRAINT document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;")

    op.execute("ALTER TABLE community_submissions DROP CONSTRAINT IF EXISTS community_submissions_subject_id_fkey;")
    op.execute("ALTER TABLE community_submissions ADD CONSTRAINT community_submissions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;")

    # 4. CHECK Constraints & Data Normalization
    op.execute("UPDATE download_logs SET action = 'DOCUMENT_VIEWED' WHERE action = 'view';")

    op.execute("""
        ALTER TABLE download_logs
            ADD CONSTRAINT chk_download_logs_action
            CHECK (action IN (
                'DOCUMENT_VIEWED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPLOADED',
                'DOCUMENT_SHARED', 'DOCUMENT_DELETED', 'DOCUMENT_RESTORED',
                'DOCUMENT_RECEIVED', 'DOCUMENT_CONTRIBUTED', 'DOCUMENT_SAVED'
            )) NOT VALID;
    """)
    op.execute("ALTER TABLE download_logs VALIDATE CONSTRAINT chk_download_logs_action;")

    op.execute("""
        ALTER TABLE documents
            ADD CONSTRAINT chk_documents_scope
            CHECK (NOT (is_public AND workspace_id IS NOT NULL)) NOT VALID;
    """)
    op.execute("ALTER TABLE documents VALIDATE CONSTRAINT chk_documents_scope;")

    op.execute("""
        ALTER TABLE workspaces
            ADD CONSTRAINT chk_workspaces_type
            CHECK (type IN ('group', 'faculty', 'class')) NOT VALID;
    """)
    op.execute("ALTER TABLE workspaces VALIDATE CONSTRAINT chk_workspaces_type;")

    op.execute("""
        ALTER TABLE document_shares
            ADD CONSTRAINT chk_document_shares_status
            CHECK (status IN ('pending', 'accepted', 'auto_accepted')) NOT VALID;
    """)
    op.execute("ALTER TABLE document_shares VALIDATE CONSTRAINT chk_document_shares_status;")


def downgrade() -> None:
    # 4. Drop CHECK Constraints
    op.execute("ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_scope;")
    op.execute("ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS chk_workspaces_type;")
    op.execute("ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS chk_document_shares_status;")
    op.execute("ALTER TABLE download_logs DROP CONSTRAINT IF EXISTS chk_download_logs_action;")

    # 3. Restore FK Delete Policies
    op.execute("ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS document_shares_source_document_id_fkey;")
    op.execute("ALTER TABLE document_shares ADD CONSTRAINT document_shares_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE NO ACTION;")

    op.execute("ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS document_shares_document_id_fkey;")
    op.execute("ALTER TABLE document_shares ADD CONSTRAINT document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE NO ACTION;")

    op.execute("ALTER TABLE community_submissions DROP CONSTRAINT IF EXISTS community_submissions_subject_id_fkey;")
    op.execute("ALTER TABLE community_submissions ADD CONSTRAINT community_submissions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT;")

    # 2. Restore deleted_at type
    op.execute("ALTER TABLE documents ALTER COLUMN deleted_at TYPE TIMESTAMP WITHOUT TIME ZONE;")

    # 1. Restore nullable booleans
    op.execute("ALTER TABLE documents ALTER COLUMN is_deleted DROP NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN is_deleted DROP DEFAULT;")
    op.execute("ALTER TABLE documents ALTER COLUMN is_important DROP NOT NULL;")
    op.execute("ALTER TABLE documents ALTER COLUMN is_important DROP DEFAULT;")

    op.execute("ALTER TABLE notifications ALTER COLUMN is_read DROP NOT NULL;")
    op.execute("ALTER TABLE notifications ALTER COLUMN is_read DROP DEFAULT;")
