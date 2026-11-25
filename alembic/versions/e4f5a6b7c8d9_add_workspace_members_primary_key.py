"""add_workspace_members_primary_key

Revision ID: e4f5a6b7c8d9
Revises: c3d4e5f6a7b8
Create Date: 2026-11-23 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_primary_key(
        'pk_workspace_members',
        'workspace_members',
        ['workspace_id', 'user_id']
    )


def downgrade() -> None:
    op.drop_constraint(
        'pk_workspace_members',
        'workspace_members',
        type_='primary'
    )
