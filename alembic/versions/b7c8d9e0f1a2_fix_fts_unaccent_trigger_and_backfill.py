"""fix_fts_unaccent_trigger_and_backfill

Revision ID: b7c8d9e0f1a2
Revises: 6a8f0b1c2d3e, f5a6b7c8d9e0
Create Date: 2026-11-23 18:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = ('6a8f0b1c2d3e', 'f5a6b7c8d9e0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Bảo đảm extension unaccent sẵn sàng
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")

    # 2. Xóa trigger và function xung đột cũ (tsvector_update) chỉ vector hóa content
    op.execute("DROP TRIGGER IF EXISTS tsvector_update ON documents;")
    op.execute("DROP FUNCTION IF EXISTS documents_search_vector_update();")

    # 3. Tạo function cập nhật search_vector duy nhất: unaccent('simple') trên title (A), description (B), content (C)
    op.execute("""
        CREATE OR REPLACE FUNCTION update_document_search_vector()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', unaccent(coalesce(NEW.title, ''))), 'A') ||
                setweight(to_tsvector('simple', unaccent(coalesce(NEW.description, ''))), 'B') ||
                setweight(to_tsvector('simple', unaccent(coalesce(NEW.content, ''))), 'C');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # 4. Tạo trigger duy nhất cho INSERT hoặc UPDATE của title, description, content
    op.execute("DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;")
    op.execute("""
        CREATE TRIGGER trg_documents_search_vector
        BEFORE INSERT OR UPDATE OF title, description, content
        ON documents
        FOR EACH ROW
        EXECUTE FUNCTION update_document_search_vector();
    """)

    # 5. Backfill toàn bộ dữ liệu documents hiện có theo vector chuẩn hóa mới
    op.execute("""
        UPDATE documents
        SET search_vector =
            setweight(to_tsvector('simple', unaccent(coalesce(title, ''))), 'A') ||
            setweight(to_tsvector('simple', unaccent(coalesce(description, ''))), 'B') ||
            setweight(to_tsvector('simple', unaccent(coalesce(content, ''))), 'C');
    """)


def downgrade() -> None:
    # Phục hồi function và trigger cũ theo 45ab664fbe54
    op.execute("""
        CREATE OR REPLACE FUNCTION update_document_search_vector()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B');
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;

        CREATE TRIGGER trg_documents_search_vector
        BEFORE INSERT OR UPDATE OF title, content
        ON documents
        FOR EACH ROW
        EXECUTE FUNCTION update_document_search_vector();
    """)
