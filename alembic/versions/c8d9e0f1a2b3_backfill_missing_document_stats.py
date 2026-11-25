"""backfill_missing_document_stats

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-11-23 18:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c8d9e0f1a2b3'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill idempotent cho các documents chưa có bản ghi document_stats tương ứng.
    # Khớp chính xác defaults từ model DocumentStats và migration d76927b437fe:
    # view_count=0, download_count=0, save_count=0, share_count=0, unique_viewers=0,
    # trending_score=0.0, last_activity_at=NULL, updated_at=COALESCE(created_at, now())
    op.execute("""
        INSERT INTO document_stats (
            document_id,
            view_count,
            download_count,
            save_count,
            share_count,
            unique_viewers,
            trending_score,
            last_activity_at,
            updated_at
        )
        SELECT 
            d.id,
            0,
            0,
            0,
            0,
            0,
            0.0,
            NULL,
            COALESCE(d.created_at, now())
        FROM documents d
        LEFT JOIN document_stats st ON st.document_id = d.id
        WHERE st.document_id IS NULL
        ON CONFLICT (document_id) DO NOTHING;
    """)


def downgrade() -> None:
    # Đây là migration dữ liệu bù đắp toàn vẹn (idempotent data backfill).
    # Không xóa ngược document_stats để tránh tái tạo tình trạng thiếu dữ liệu (integrity gap)
    # và tránh làm mất thống kê nếu tài liệu phát sinh tương tác sau khi backfill.
    pass
