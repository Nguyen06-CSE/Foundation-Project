"""bridge_live_baseline_before_f844

Revision ID: c9d0e1f2a3b4
Revises: dae4972dff87
Create Date: 2026-11-25 20:00:00.000000

Bridge the tables/columns/FKs/indexes that existed in the Live schema but were
never emitted by the original init migration. `folders` is deliberately created
in its pre-f844 shape (naive created_at, updated_at, ON DELETE CASCADE owner FK)
so f844331e6c1e still applies unchanged.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, Sequence[str], None] = 'dae4972dff87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        'subjects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('faculty_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('faculty_id', 'code', name='subjects_code_faculty_key'),
    )
    op.create_index('ix_subjects_faculty_id', 'subjects', ['faculty_id'])
    op.execute("CREATE INDEX IF NOT EXISTS idx_subjects_name_trgm ON subjects USING gin (name gin_trgm_ops)")

    # Pre-f844 shape: f844 alters created_at to timestamptz, drops updated_at and
    # recreates the owner FK without ON DELETE CASCADE.
    op.create_table(
        'folders',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('workspace_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='folders_owner_id_fkey', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_folders_workspace_id', 'folders', ['workspace_id'])
    op.create_index('ix_document_tags_tag_document', 'document_tags', ['tag_id', 'document_id'])

    op.create_table(
        'folder_tags',
        sa.Column('folder_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['folder_id'], ['folders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('folder_id', 'tag_id'),
    )

    op.create_table(
        'document_ratings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('stars', sa.SmallInteger(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint('stars >= 1 AND stars <= 5', name='document_ratings_stars_check'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id', 'user_id', name='document_ratings_unique_user_doc'),
    )
    op.create_index('ix_document_ratings_document_id', 'document_ratings', ['document_id'])
    op.create_index('ix_document_ratings_user_id', 'document_ratings', ['user_id'])

    # RESTRICT here is the Live pre-e0f1 shape; e0f1a2b3c4d5 converts it to CASCADE.
    op.create_table(
        'community_submissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('source_document_id', sa.Integer(), nullable=False),
        sa.Column('published_document_id', sa.Integer(), nullable=True),
        sa.Column('submitter_id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('academic_year', sa.String(length=50), nullable=True),
        sa.Column('doc_type', sa.String(length=50), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reject_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['source_document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['published_document_id'], ['documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['submitter_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_community_submissions_status', 'community_submissions', ['status'])
    op.create_index('ix_community_submissions_subject', 'community_submissions', ['subject_id'])
    op.create_index('ix_community_submissions_submitter', 'community_submissions', ['submitter_id'])
    op.create_index('ix_community_submissions_reviewed_by', 'community_submissions', ['reviewed_by'])

    op.add_column('workspaces', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True))
    op.add_column('tags', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_foreign_key('tags_workspace_id_fkey', 'tags', 'workspaces', ['workspace_id'], ['id'])

    op.add_column('documents', sa.Column('thumbnail_path', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('markdown_path', sa.String(length=1024), nullable=True))
    op.add_column('documents', sa.Column('is_orphaned', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('documents', sa.Column('orphaned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('documents', sa.Column('trash_source', sa.String(length=30), nullable=True))
    op.add_column('documents', sa.Column('trash_group_name', sa.String(length=150), nullable=True))
    op.add_column('documents', sa.Column('is_public', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('documents', sa.Column('subject_id', sa.Integer(), nullable=True))
    op.add_column('documents', sa.Column('is_bundle', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('documents', sa.Column('bundle_parent_id', sa.Integer(), nullable=True))
    # Widen to the Live/ORM lengths; the original init used shorter varchar limits.
    op.execute("ALTER TABLE documents ALTER COLUMN file_type TYPE VARCHAR(255)")
    op.execute("ALTER TABLE documents ALTER COLUMN checksum TYPE VARCHAR(255)")
    op.create_foreign_key('documents_subject_id_fkey', 'documents', 'subjects', ['subject_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_documents_bundle_parent_id', 'documents', 'documents', ['bundle_parent_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_documents_is_public', 'documents', ['is_public'])
    op.create_index('ix_documents_subject_id', 'documents', ['subject_id'])
    op.create_index('ix_documents_owner_workspace_created', 'documents', ['owner_id', 'workspace_id', 'is_deleted', 'is_public', 'bundle_parent_id', 'created_at', 'id'])
    op.create_index('ix_documents_workspace_created', 'documents', ['workspace_id', 'is_deleted', 'bundle_parent_id', 'created_at', 'id'])

    for table, column in (
        ('users', 'email'), ('users', 'full_name'), ('users', 'student_code'), ('users', 'username'),
        ('workspaces', 'name'),
    ):
        op.execute(f"CREATE INDEX IF NOT EXISTS idx_{table}_{column}_trgm ON {table} USING gin ({column} gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_document_title_trgm ON documents USING gin (title gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_documents_title_trgm ON documents USING gin (title gin_trgm_ops)")


def downgrade() -> None:
    # b3c4d5e6f7a8's downgrade restores this view, which depends on the
    # document columns removed below; drop it before reversing the bridge.
    op.execute("DROP MATERIALIZED VIEW IF EXISTS community_subject_stats")
    op.execute("DROP INDEX IF EXISTS idx_documents_title_trgm")
    op.execute("DROP INDEX IF EXISTS idx_document_title_trgm")
    for table, column in (
        ('users', 'email'), ('users', 'full_name'), ('users', 'student_code'), ('users', 'username'),
        ('workspaces', 'name'),
    ):
        op.execute(f"DROP INDEX IF EXISTS idx_{table}_{column}_trgm")

    op.drop_index('ix_documents_workspace_created', table_name='documents')
    op.drop_index('ix_documents_owner_workspace_created', table_name='documents')
    op.drop_index('ix_documents_subject_id', table_name='documents')
    op.drop_index('ix_documents_is_public', table_name='documents')
    op.drop_constraint('fk_documents_bundle_parent_id', 'documents', type_='foreignkey')
    op.drop_constraint('documents_subject_id_fkey', 'documents', type_='foreignkey')
    for column in (
        'bundle_parent_id', 'is_bundle', 'subject_id', 'is_public', 'trash_group_name',
        'trash_source', 'orphaned_at', 'is_orphaned', 'markdown_path', 'thumbnail_path',
    ):
        op.drop_column('documents', column)
    # shortcut: keep the widened varchar lengths; narrowing here could truncate data.

    op.drop_constraint('tags_workspace_id_fkey', 'tags', type_='foreignkey')
    op.drop_column('tags', 'workspace_id')
    op.drop_column('workspaces', 'updated_at')

    for index in (
        'ix_community_submissions_reviewed_by', 'ix_community_submissions_submitter',
        'ix_community_submissions_subject', 'ix_community_submissions_status',
    ):
        op.drop_index(index, table_name='community_submissions')
    op.drop_table('community_submissions')

    op.drop_index('ix_document_ratings_user_id', table_name='document_ratings')
    op.drop_index('ix_document_ratings_document_id', table_name='document_ratings')
    op.drop_table('document_ratings')

    op.drop_table('folder_tags')
    op.drop_index('ix_document_tags_tag_document', table_name='document_tags')
    op.drop_index('ix_folders_workspace_id', table_name='folders')
    op.drop_table('folders')

    op.execute("DROP INDEX IF EXISTS idx_subjects_name_trgm")
    op.drop_index('ix_subjects_faculty_id', table_name='subjects')
    op.drop_table('subjects')
