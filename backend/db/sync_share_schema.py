import asyncio
from sqlalchemy import text
from app.core.database import engine
from app.models.base import Base
from app.models import document_share  # noqa: F401

async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        statements = [
            "ALTER TABLE document_shares ALTER COLUMN document_id DROP NOT NULL",
            "ALTER TABLE document_shares ALTER COLUMN source_document_id DROP NOT NULL",
            "ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS source_workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE",
            "ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS message VARCHAR(500)",
            "ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE",
            "CREATE INDEX IF NOT EXISTS ix_document_shares_to_user_status ON document_shares(to_user_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_document_shares_from_user_status ON document_shares(from_user_id, status)",
            "DROP INDEX IF EXISTS uq_document_shares_pending",
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_document_share_pending
            ON document_shares (from_user_id, to_user_id, source_document_id)
            WHERE status = 'pending' AND source_document_id IS NOT NULL
            """,
            """
            CREATE INDEX IF NOT EXISTS ix_documents_source_owner
            ON documents (source_document_id, owner_id)
            WHERE is_deleted = false AND source_document_id IS NOT NULL
            """,
            # 1. Chuẩn hóa các dòng metadata bị lưu dạng JSON 'null' hoặc mảng '[null, {...}]' về object chuẩn
            """
            UPDATE documents
            SET metadata = NULL
            WHERE metadata IS NOT NULL AND jsonb_typeof(metadata) = 'null'
            """,
            """
            UPDATE documents d
            SET metadata = COALESCE(
                (
                    SELECT jsonb_object_agg(k, v)
                    FROM jsonb_array_elements(d.metadata) AS elem,
                         LATERAL jsonb_each(
                             CASE WHEN jsonb_typeof(elem) = 'object' THEN elem ELSE '{}'::jsonb END
                         ) AS kv(k, v)
                ),
                '{}'::jsonb
            )
            WHERE d.metadata IS NOT NULL AND jsonb_typeof(d.metadata) = 'array'
            """,
            # 2. Backfill metadata.shared_by cho các bản sao đã nhận từ document_shares
            """
            UPDATE documents d
            SET metadata = (
                CASE
                    WHEN d.metadata IS NULL OR jsonb_typeof(d.metadata) != 'object' THEN '{}'::jsonb
                    ELSE d.metadata
                END
            ) || jsonb_build_object(
                'shared_by', jsonb_build_object(
                    'id', u.id,
                    'username', u.username,
                    'full_name', COALESCE(u.full_name, u.username),
                    'role', u.role
                ),
                'shared_at', COALESCE(ds.responded_at, ds.created_at)
            )
            FROM document_shares ds
            JOIN users u ON ds.from_user_id = u.id
            WHERE ds.document_id = d.id
              AND ds.status IN ('accepted', 'auto_accepted')
              AND (d.metadata IS NULL OR jsonb_typeof(d.metadata) != 'object' OR NOT (d.metadata ? 'shared_by'))
            """,
            # 3. Backfill metadata.is_shared cho các tài liệu gốc đã đem chia sẻ
            """
            UPDATE documents d
            SET metadata = (
                CASE
                    WHEN d.metadata IS NULL OR jsonb_typeof(d.metadata) != 'object' THEN '{}'::jsonb
                    ELSE d.metadata
                END
            ) || '{"is_shared": true}'::jsonb
            WHERE d.id IN (
                SELECT DISTINCT source_document_id FROM document_shares WHERE source_document_id IS NOT NULL
                UNION
                SELECT DISTINCT source_document_id FROM documents WHERE workspace_id IS NOT NULL AND source_document_id IS NOT NULL
            )
            AND (d.metadata IS NULL OR jsonb_typeof(d.metadata) != 'object' OR NOT (d.metadata ? 'is_shared'))
            """,
        ]
        for statement in statements:
            try:
                await conn.execute(text(statement))
            except Exception as e:
                print(f"Notice executing statement: {e}")
    print("Schema & metadata normalization/backfill for document_shares completed.")

if __name__ == "__main__":
    asyncio.run(main())
