"""normalize workspace_members permission_level to view and full only

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-11-23 20:42:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'e0f1a2b3c4d5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Migrate all existing 'edit' permission rows to 'full'
    op.execute(
        "UPDATE workspace_members SET permission_level = 'full' WHERE permission_level = 'edit'"
    )
    # 2. Add CHECK constraint allowing only 'view' and 'full' as NOT VALID first
    op.execute(
        "ALTER TABLE workspace_members ADD CONSTRAINT chk_workspace_members_permission "
        "CHECK (permission_level IN ('view', 'full')) NOT VALID"
    )
    # 3. Validate the CHECK constraint
    op.execute(
        "ALTER TABLE workspace_members VALIDATE CONSTRAINT chk_workspace_members_permission"
    )


def downgrade() -> None:
    # 1. Drop CHECK constraint
    op.execute(
        "ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS chk_workspace_members_permission"
    )
    # 2. Revert migrated rows back to 'edit'
    op.execute(
        "UPDATE workspace_members SET permission_level = 'edit' "
        "WHERE workspace_id = 3 AND user_id = 8"
    )
    op.execute(
        "UPDATE workspace_members SET permission_level = 'edit' "
        "WHERE workspace_id = 5 AND user_id = 6"
    )
