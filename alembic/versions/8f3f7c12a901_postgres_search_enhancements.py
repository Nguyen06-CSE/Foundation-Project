"""postgres search enhancements

Revision ID: 8f3f7c12a901
Revises: 0d7a4b513607
Create Date: 2026-08-20 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "8f3f7c12a901"
down_revision: Union[str, Sequence[str], None] = "0d7a4b513607"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION documents_search_vector_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                to_tsvector(
                    'simple',
                    unaccent(coalesce(NEW.title, '')) || ' ' ||
                    unaccent(coalesce(NEW.description, '')) || ' ' ||
                    unaccent(coalesce(NEW.content, ''))
                );
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute("DROP TRIGGER IF EXISTS trg_documents_search_vector_update ON documents")
    op.execute(
        """
        CREATE TRIGGER trg_documents_search_vector_update
        BEFORE INSERT OR UPDATE OF title, description, content
        ON documents
        FOR EACH ROW
        EXECUTE FUNCTION documents_search_vector_update();
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_documents_search_vector ON documents USING GIN (search_vector)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_documents_title_trgm ON documents USING GIN (title gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_documents_title_trgm")
    op.execute("DROP INDEX IF EXISTS ix_documents_search_vector")
    op.execute("DROP TRIGGER IF EXISTS trg_documents_search_vector_update ON documents")
    op.execute("DROP FUNCTION IF EXISTS documents_search_vector_update")
