"""Enable pgvector storage for document chunk embeddings."""
from alembic import op

revision = "f2c3d4e5a6b7"
down_revision = "ea41b38547bc"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    # Untyped vector keeps model/dimension changes possible. Queries always
    # filter by document_index_runs.model before comparing vectors.
    op.execute("ALTER TABLE document_chunks ADD COLUMN embedding vector")


def downgrade():
    op.execute("ALTER TABLE document_chunks DROP COLUMN embedding")

