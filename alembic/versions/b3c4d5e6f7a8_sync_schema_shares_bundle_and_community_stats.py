"""sync_schema_shares_bundle_and_community_stats

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-11-25 09:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update chk_document_shares_status to permit all 6 valid statuses:
    #    'pending', 'accepted', 'rejected', 'auto_accepted', 'expired', 'withdrawn'.
    #    Preflight check: abort with RAISE EXCEPTION if any unallowed status exists.
    op.execute("""
        DO $$
        DECLARE
            invalid_count INTEGER;
            invalid_statuses TEXT;
        BEGIN
            SELECT COUNT(*), COALESCE(string_agg(DISTINCT status, ', '), '')
            INTO invalid_count, invalid_statuses
            FROM document_shares
            WHERE status NOT IN ('pending', 'accepted', 'rejected', 'auto_accepted', 'expired', 'withdrawn');

            IF invalid_count > 0 THEN
                RAISE EXCEPTION 'Cannot update chk_document_shares_status: found % rows with invalid status (%)',
                    invalid_count, invalid_statuses;
            END IF;
        END $$
    """)

    op.execute("ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS chk_document_shares_status")
    op.execute("""
        ALTER TABLE document_shares
            ADD CONSTRAINT chk_document_shares_status
            CHECK (status IN ('pending', 'accepted', 'rejected', 'auto_accepted', 'expired', 'withdrawn'))
            NOT VALID
    """)
    op.execute("ALTER TABLE document_shares VALIDATE CONSTRAINT chk_document_shares_status")

    # 2. Add index on documents.bundle_parent_id to match ORM
    op.execute("CREATE INDEX IF NOT EXISTS ix_documents_bundle_parent_id ON documents (bundle_parent_id)")

    # 3. Deduplicate the two title trigram indexes, but only after proving they
    #    are structurally identical. Live currently has both:
    #      - idx_document_title_trgm   (legacy, fewer scans)
    #      - idx_documents_title_trgm  (retained)
    #    If the retained index is missing (clean DB), create the canonical index
    #    first so this migration still reproduces the expected schema. If any
    #    catalog condition cannot be proven, keep both indexes and emit NOTICE.
    op.execute("""
        DO $$
        DECLARE
            dup_index REGCLASS := to_regclass('idx_document_title_trgm');
            keep_index REGCLASS := to_regclass('idx_documents_title_trgm');
            gin_am OID;
            trgm_opclass OID;
            title_attnum SMALLINT;
            keep_ok BOOLEAN := FALSE;
            dup_ok BOOLEAN := FALSE;
        BEGIN
            SELECT oid INTO gin_am FROM pg_am WHERE amname = 'gin';
            SELECT oid INTO trgm_opclass
            FROM pg_opclass
            WHERE opcname = 'gin_trgm_ops' AND opcmethod = gin_am;
            SELECT attnum INTO title_attnum
            FROM pg_attribute
            WHERE attrelid = 'documents'::regclass
              AND attname = 'title'
              AND NOT attisdropped;

            IF keep_index IS NULL THEN
                EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
                EXECUTE 'CREATE INDEX idx_documents_title_trgm ON documents USING gin (title gin_trgm_ops)';
                keep_index := to_regclass('idx_documents_title_trgm');
                RAISE NOTICE 'Created missing retained index idx_documents_title_trgm (GIN title gin_trgm_ops).';
            END IF;

            SELECT EXISTS (
                SELECT 1
                FROM pg_index i
                JOIN pg_class ic ON ic.oid = i.indexrelid
                JOIN pg_class tc ON tc.oid = i.indrelid
                WHERE i.indexrelid = keep_index
                  AND tc.oid = 'documents'::regclass
                  AND ic.relam = gin_am
                  AND i.indisvalid AND i.indisready AND i.indislive
                  AND i.indnkeyatts = 1 AND i.indnatts = 1
                  AND i.indkey[0] = title_attnum
                  AND i.indclass[0] = trgm_opclass
                  AND i.indpred IS NULL
                  AND i.indexprs IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid
                  )
            ) INTO keep_ok;

            IF dup_index IS NOT NULL AND keep_ok THEN
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_index d
                    JOIN pg_index k ON k.indexrelid = keep_index
                    JOIN pg_class dc ON dc.oid = d.indexrelid
                    JOIN pg_class kc ON kc.oid = k.indexrelid
                    WHERE d.indexrelid = dup_index
                      AND d.indexrelid <> k.indexrelid
                      AND d.indrelid = k.indrelid
                      AND d.indrelid = 'documents'::regclass
                      AND dc.relam = kc.relam
                      AND dc.relam = gin_am
                      AND d.indisvalid AND d.indisready AND d.indislive
                      AND k.indisvalid AND k.indisready AND k.indislive
                      AND d.indisunique = k.indisunique
                      AND d.indnkeyatts = k.indnkeyatts
                      AND d.indnatts = k.indnatts
                      AND d.indkey = k.indkey
                      AND d.indclass = k.indclass
                      AND d.indcollation = k.indcollation
                      AND d.indoption = k.indoption
                      AND d.indpred IS NULL
                      AND k.indpred IS NULL
                      AND d.indexprs IS NULL
                      AND k.indexprs IS NULL
                      AND d.indkey[0] = title_attnum
                      AND d.indclass[0] = trgm_opclass
                      AND NOT EXISTS (
                          SELECT 1 FROM pg_constraint c
                          WHERE c.conindid IN (d.indexrelid, k.indexrelid)
                      )
                ) INTO dup_ok;
            END IF;

            IF dup_ok THEN
                EXECUTE 'DROP INDEX idx_document_title_trgm';
                RAISE NOTICE 'Dropped duplicate index idx_document_title_trgm; retained idx_documents_title_trgm.';
            ELSIF dup_index IS NOT NULL THEN
                RAISE NOTICE 'Kept idx_document_title_trgm: could not prove it is identical to a valid idx_documents_title_trgm (GIN title gin_trgm_ops).';
            END IF;
        END $$
    """)

    # 4. Manage community_subject_stats Materialized View.
    #    Keep the Live column list, types and formulas exactly:
    #      subject_id, faculty_id,
    #      document_count  = count(DISTINCT d.id)                 -> bigint
    #      total_downloads = COALESCE(sum(dl.download_count), 0)   -> numeric
    #      avg_rating      = COALESCE(avg(dr.avg_stars), 0)        -> numeric
    #    The only semantic change is filtering the download subquery to
    #    action = 'DOCUMENT_DOWNLOADED'. Do not use CASCADE: if another object
    #    depends on the view, DROP must fail and roll back safely.
    op.execute("DROP MATERIALIZED VIEW IF EXISTS community_subject_stats")
    op.execute("""
        CREATE MATERIALIZED VIEW community_subject_stats AS
        SELECT
            s.id AS subject_id,
            s.faculty_id,
            count(DISTINCT d.id) AS document_count,
            COALESCE(sum(dl.download_count), 0::numeric) AS total_downloads,
            COALESCE(avg(dr.avg_stars), 0::numeric) AS avg_rating
        FROM subjects s
        LEFT JOIN documents d
          ON d.subject_id = s.id
         AND d.is_public = true
         AND d.is_deleted = false
        LEFT JOIN (
            SELECT download_logs.document_id, count(*) AS download_count
            FROM download_logs
            WHERE download_logs.action = 'DOCUMENT_DOWNLOADED'
            GROUP BY download_logs.document_id
        ) dl ON dl.document_id = d.id
        LEFT JOIN (
            SELECT document_ratings.document_id, avg(document_ratings.stars) AS avg_stars
            FROM document_ratings
            GROUP BY document_ratings.document_id
        ) dr ON dr.document_id = d.id
        GROUP BY s.id, s.faculty_id
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_community_subject_stats_subject_id
        ON community_subject_stats (subject_id)
    """)


def downgrade() -> None:
    # 4. Restore the exact Live baseline definition (unfiltered downloads),
    #    keeping the unique subject_id index required for CONCURRENTLY refresh.
    op.execute("DROP MATERIALIZED VIEW IF EXISTS community_subject_stats")
    op.execute("""
        CREATE MATERIALIZED VIEW community_subject_stats AS
        SELECT
            s.id AS subject_id,
            s.faculty_id,
            count(DISTINCT d.id) AS document_count,
            COALESCE(sum(dl.download_count), 0::numeric) AS total_downloads,
            COALESCE(avg(dr.avg_stars), 0::numeric) AS avg_rating
        FROM subjects s
        LEFT JOIN documents d
          ON d.subject_id = s.id
         AND d.is_public = true
         AND d.is_deleted = false
        LEFT JOIN (
            SELECT download_logs.document_id, count(*) AS download_count
            FROM download_logs
            GROUP BY download_logs.document_id
        ) dl ON dl.document_id = d.id
        LEFT JOIN (
            SELECT document_ratings.document_id, avg(document_ratings.stars) AS avg_stars
            FROM document_ratings
            GROUP BY document_ratings.document_id
        ) dr ON dr.document_id = d.id
        GROUP BY s.id, s.faculty_id
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_community_subject_stats_subject_id
        ON community_subject_stats (subject_id)
    """)

    # 3. Restore the legacy title trigram index without touching the retained
    #    idx_documents_title_trgm.
    op.execute("CREATE INDEX IF NOT EXISTS idx_document_title_trgm ON documents USING gin (title gin_trgm_ops)")

    # 2. Drop index on documents.bundle_parent_id
    op.execute("DROP INDEX IF EXISTS ix_documents_bundle_parent_id")

    # 1. Restore previous chk_document_shares_status (with strict check: fail if rows have rejected/expired/withdrawn)
    op.execute("""
        DO $$
        DECLARE
            invalid_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO invalid_count
            FROM document_shares
            WHERE status NOT IN ('pending', 'accepted', 'auto_accepted');

            IF invalid_count > 0 THEN
                RAISE EXCEPTION 'Cannot downgrade chk_document_shares_status: % rows contain status outside (pending, accepted, auto_accepted)', invalid_count;
            END IF;
        END $$
    """)
    op.execute("ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS chk_document_shares_status")
    op.execute("""
        ALTER TABLE document_shares
            ADD CONSTRAINT chk_document_shares_status
            CHECK (status IN ('pending', 'accepted', 'auto_accepted'))
            NOT VALID
    """)
    op.execute("ALTER TABLE document_shares VALIDATE CONSTRAINT chk_document_shares_status")
