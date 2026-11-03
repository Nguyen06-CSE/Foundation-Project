"""add_notifications_link_and_user_todos

Revision ID: a1b2c3d4e5f6
Revises: d76927b437fe
Create Date: 2026-11-03 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'd76927b437fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50)")
    op.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255)")
    op.create_table(
        'user_todos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('task_type', sa.String(length=30), nullable=False, server_default='custom'),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('workspace_id', sa.Integer(), nullable=True),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('priority', sa.String(length=10), nullable=False, server_default='normal'),
        sa.Column('remind_before_minutes', sa.Integer(), nullable=True, server_default='30'),
        sa.Column('reminded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_todos_user_id', 'user_todos', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_user_todos_user_id', table_name='user_todos')
    op.drop_table('user_todos')
    op.execute("ALTER TABLE notifications DROP COLUMN IF EXISTS link")
