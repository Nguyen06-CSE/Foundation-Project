"""drop_duplicate_fts_gin_index

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-11-23 17:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, Sequence[str], None] = 'e4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            'idx_document_search_vector',
            table_name='documents',
            postgresql_concurrently=True,
            if_exists=True
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.create_index(
            'idx_document_search_vector',
            'documents',
            ['search_vector'],
            unique=False,
            postgresql_using='gin',
            postgresql_concurrently=True,
            if_not_exists=True
        )
