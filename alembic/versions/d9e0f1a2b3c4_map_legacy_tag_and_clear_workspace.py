"""map_legacy_tag_and_clear_workspace

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-11-23 19:42:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'd9e0f1a2b3c4'
down_revision: Union[str, Sequence[str], None] = 'c8d9e0f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Chuyển mapping tag có legacy workspace_id (tag 39 thuộc workspace 10, owner 6) vào bảng chuẩn workspace_tags.
    # Sử dụng ON CONFLICT (workspace_id, tag_id) DO NOTHING để đảm bảo tính idempotent.
    op.execute("""
        INSERT INTO workspace_tags (workspace_id, tag_id, owner_user_id)
        SELECT t.workspace_id, t.id, COALESCE(t.owner_id, w.owner_id)
        FROM tags t
        JOIN workspaces w ON w.id = t.workspace_id
        WHERE t.id = 39 AND t.workspace_id = 10
        ON CONFLICT (workspace_id, tag_id) DO NOTHING;
    """)

    # 2. Xoá giá trị legacy workspace_id trên bảng tags đối với tag 39 (chuẩn hóa về NULL theo mô hình workspace_tags)
    op.execute("""
        UPDATE tags
        SET workspace_id = NULL
        WHERE id = 39 AND workspace_id = 10;
    """)


def downgrade() -> None:
    # Khôi phục lại tags.workspace_id = 10 cho tag 39
    op.execute("""
        UPDATE tags
        SET workspace_id = 10
        WHERE id = 39 AND workspace_id IS NULL;
    """)
    # Xoá mapping đã tạo trong workspace_tags
    op.execute("""
        DELETE FROM workspace_tags
        WHERE workspace_id = 10 AND tag_id = 39;
    """)
