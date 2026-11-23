"""add download logs access filter index

Revision ID: 6a8f0b1c2d3e
Revises: f5a6b7c8d9e0
Create Date: 2026-11-23 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = '6a8f0b1c2d3e'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = 'ix_download_logs_user_action_created_document'


def upgrade() -> None:
    # accessed_within lọc theo user + action + created_at rồi lấy document_id.
    with op.get_context().autocommit_block():
        op.create_index(
            INDEX_NAME,
            'download_logs',
            ['user_id', 'action', 'created_at', 'document_id'],
            unique=False,
            postgresql_concurrently=True,
            if_not_exists=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            INDEX_NAME,
            table_name='download_logs',
            postgresql_concurrently=True,
            if_exists=True,
        )
