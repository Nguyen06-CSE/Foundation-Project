"""drop obsolete processing_jobs and trash_batches artifacts

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-11-23 20:46:00.000000

Phase 4: Drop legacy unused tables (processing_jobs, trash_batches) and documents.trash_batch_id.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'a2b3c4d5e6f7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop foreign key constraint on documents.trash_batch_id referencing trash_batches
    op.execute(
        "ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_trash_batch_id_fkey"
    )
    # 2. Drop column trash_batch_id from documents table
    op.execute(
        "ALTER TABLE documents DROP COLUMN IF EXISTS trash_batch_id"
    )
    # 3. Drop table trash_batches (contains 2 legacy seed rows, 0 active document references)
    op.execute(
        "DROP TABLE IF EXISTS trash_batches CASCADE"
    )
    # 4. Drop table processing_jobs (0 rows, 0 endpoints/callers)
    op.execute(
        "DROP TABLE IF EXISTS processing_jobs CASCADE"
    )


def downgrade() -> None:
    # 1. Recreate table trash_batches with exact original DDL and FK constraints
    op.execute("""
        CREATE TABLE IF NOT EXISTS trash_batches (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER CONSTRAINT trash_batches_workspace_id_fkey REFERENCES workspaces(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            deleted_by INTEGER NOT NULL CONSTRAINT trash_batches_deleted_by_fkey REFERENCES users(id) ON DELETE RESTRICT,
            deleted_at TIMESTAMPTZ NOT NULL,
            purge_at TIMESTAMPTZ NOT NULL
        )
    """)

    # 2. Validate existence of parent records before restoring hardcoded seed rows
    # Fail cleanly and abort transaction if parent user/workspace does not exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM users WHERE id = 6) THEN
                RAISE EXCEPTION 'Cannot restore trash_batches seed row 1: parent user id=6 not found';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM users WHERE id = 7) THEN
                RAISE EXCEPTION 'Cannot restore trash_batches seed row 2: parent user id=7 not found';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = 3) THEN
                RAISE EXCEPTION 'Cannot restore trash_batches seed row 1: parent workspace id=3 not found';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = 5) THEN
                RAISE EXCEPTION 'Cannot restore trash_batches seed row 2: parent workspace id=5 not found';
            END IF;
        END $$
    """)

    # 3. Re-insert preserved historical seed rows if table is empty
    op.execute("""
        INSERT INTO trash_batches (id, workspace_id, name, deleted_by, deleted_at, purge_at)
        VALUES 
            (1, 3, 'Nhóm BTL cũ (đã giải tán)', 6, '2026-09-02 10:37:44.601535+00', '2026-10-02 10:37:44.601557+00'),
            (2, 5, 'Tài liệu ôn thi cũ', 7, '2026-08-29 11:08:17.855059+00', '2026-09-28 11:08:17.855060+00')
        ON CONFLICT (id) DO NOTHING
    """)

    # 4. Synchronize SERIAL sequence so next generated id > max(id)
    op.execute("""
        SELECT setval(
            pg_get_serial_sequence('trash_batches', 'id'),
            COALESCE((SELECT MAX(id) FROM trash_batches), 1),
            (SELECT MAX(id) IS NOT NULL FROM trash_batches)
        )
    """)

    # 5. Re-add column documents.trash_batch_id and restore FK constraint idempotently
    op.execute(
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS trash_batch_id INTEGER"
    )
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'documents_trash_batch_id_fkey' AND table_name = 'documents'
            ) THEN
                ALTER TABLE documents ADD CONSTRAINT documents_trash_batch_id_fkey
                FOREIGN KEY (trash_batch_id) REFERENCES trash_batches(id);
            END IF;
        END $$
    """)

    # 6. Recreate table processing_jobs with original DDL and FK
    op.execute("""
        CREATE TABLE IF NOT EXISTS processing_jobs (
            id SERIAL PRIMARY KEY,
            document_id INTEGER NOT NULL CONSTRAINT processing_jobs_document_id_fkey REFERENCES documents(id),
            job_type VARCHAR(50) NOT NULL,
            status VARCHAR(20),
            result JSONB,
            finished_at TIMESTAMP WITHOUT TIME ZONE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # 7. Synchronize SERIAL sequence for processing_jobs
    op.execute("""
        SELECT setval(
            pg_get_serial_sequence('processing_jobs', 'id'),
            COALESCE((SELECT MAX(id) FROM processing_jobs), 1),
            (SELECT MAX(id) IS NOT NULL FROM processing_jobs)
        )
    """)
