"""Durable document chunk index and resumable processing queue."""
from alembic import op

revision = "ea41b38547bc"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade():
    for sql in (
        """CREATE TABLE document_index_runs (
          id bigserial PRIMARY KEY, document_id integer NOT NULL REFERENCES documents ON DELETE CASCADE,
          checksum text NOT NULL, model text NOT NULL DEFAULT '', processor integer NOT NULL DEFAULT 1,
          status text NOT NULL DEFAULT 'pending', is_active boolean NOT NULL DEFAULT false,
          attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(),
          last_error text, coverage jsonb NOT NULL DEFAULT '{}', summary jsonb
        )""",
        "CREATE UNIQUE INDEX uq_document_active_run ON document_index_runs(document_id) WHERE is_active",
        "CREATE UNIQUE INDEX uq_document_pending_run ON document_index_runs(document_id) WHERE status IN ('pending','retry')",
        "CREATE INDEX ix_document_run_lookup ON document_index_runs(document_id,id DESC)",
        "CREATE INDEX ix_document_run_queue ON document_index_runs(next_attempt,id) WHERE status IN ('pending','retry')",
        """CREATE TABLE document_chunks (
          id bigserial PRIMARY KEY, run_id bigint NOT NULL REFERENCES document_index_runs ON DELETE CASCADE,
          ordinal integer NOT NULL, body text NOT NULL, heading text NOT NULL, source text NOT NULL,
          location jsonb NOT NULL, search_vector tsvector NOT NULL,
          UNIQUE(run_id,ordinal)
        )""",
        "CREATE INDEX ix_chunk_fts ON document_chunks USING gin(search_vector)",
        """CREATE FUNCTION queue_document_index() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF TG_OP = 'UPDATE' THEN
            IF ROW(OLD.checksum, OLD.content, OLD.markdown_path, OLD.file_path) IS NOT DISTINCT FROM
               ROW(NEW.checksum, NEW.content, NEW.markdown_path, NEW.file_path) THEN RETURN NEW; END IF;
            UPDATE document_index_runs SET is_active=false,status='obsolete' WHERE document_id=NEW.id AND status <> 'obsolete';
          END IF;
          IF NOT coalesce(NEW.is_bundle,false) THEN
            INSERT INTO document_index_runs(document_id,checksum) VALUES(NEW.id,NEW.checksum)
            ON CONFLICT DO NOTHING;
          END IF;
          RETURN NEW;
        END $$""",
        """CREATE TRIGGER queue_document_index AFTER INSERT OR UPDATE OF checksum,content,markdown_path,file_path
        ON documents FOR EACH ROW EXECUTE FUNCTION queue_document_index()""",
        """INSERT INTO document_index_runs(document_id,checksum) SELECT id,checksum FROM documents
        WHERE NOT coalesce(is_bundle,false)""",
    ):
        op.execute(sql)


def downgrade():
    for sql in ("DROP TRIGGER queue_document_index ON documents", "DROP FUNCTION queue_document_index()",
                "DROP TABLE document_chunks", "DROP TABLE document_index_runs"):
        op.execute(sql)
