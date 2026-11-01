# backend/app/services/dashboard_service.py

from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.trash_constants import EXPIRING_TRASH_DAYS, TRASH_RETENTION_DAYS
from app.core.config import settings
from app.models.user import User
from app.routers.groups import _role_for
from app.schemas.dashboard import (
    ContributionStats,
    DashboardSummaryOut,
    GroupStats,
    RecentActivityItem,
    RecentGroupItem,
    RecentViewedDocument,
    RejectedSubmissionBrief,
)


async def get_dashboard_summary(db: AsyncSession, current_user: User) -> DashboardSummaryOut:
    user_id = current_user.id
    now_utc = datetime.now(timezone.utc)
    naive_utc = datetime.utcnow()

    # Tính toán các mốc thời gian lọc
    # documents.deleted_at được lưu dạng timestamp without time zone qua datetime.utcnow()
    trash_cutoff_days = TRASH_RETENTION_DAYS - EXPIRING_TRASH_DAYS  # 27 ngày
    expiring_trash_cutoff = naive_utc - timedelta(days=trash_cutoff_days)
    new_docs_7d_cutoff = naive_utc - timedelta(days=7)
    rejected_14d_cutoff = now_utc - timedelta(days=14)

    # ══════════════════════════════════════════════════════════
    # QUERY 1: TỔNG HỢP CÁC CON SỐ THỐNG KÊ (SCALAR SUBQUERIES)
    # ══════════════════════════════════════════════════════════
    summary_sql = text("""
        SELECT
            -- [Khối 2.1] Lời mời nhóm đang chờ
            (SELECT COUNT(*) 
             FROM workspace_invitations 
             WHERE invited_user_id = :uid AND status = 'pending') AS pending_invitations,

            -- [Khối 2.1 - Names] Tối đa 2 tên nhóm mới nhất
            (SELECT ARRAY(
                SELECT w.name 
                FROM workspace_invitations wi 
                JOIN workspaces w ON wi.workspace_id = w.id 
                WHERE wi.invited_user_id = :uid AND wi.status = 'pending' 
                ORDER BY wi.created_at DESC 
                LIMIT 2
            )) AS pending_invitation_names,

            -- [Khối 2.2] Số đóng góp bị từ chối trong 14 ngày gần đây
            (SELECT COUNT(*) 
             FROM community_submissions 
             WHERE submitter_id = :uid AND status = 'rejected' 
               AND reviewed_at >= :rejected_cutoff) AS rejected_recent_count,

            -- [Khối 2.2 - Detail] Đóng góp bị từ chối gần nhất trong 14 ngày
            (SELECT json_build_object(
                'submission_id', cs.id,
                'title', d.title,
                'reason', cs.reject_reason
             )
             FROM community_submissions cs
             JOIN documents d ON cs.source_document_id = d.id
             WHERE cs.submitter_id = :uid AND cs.status = 'rejected' 
               AND cs.reviewed_at >= :rejected_cutoff
             ORDER BY cs.reviewed_at DESC 
             LIMIT 1) AS latest_rejected,

            -- [Khối 2.3] Tài liệu thùng rác cá nhân sắp bị xóa vĩnh viễn (còn <= 3 ngày)
            (SELECT COUNT(*) 
             FROM documents 
             WHERE owner_id = :uid AND workspace_id IS NULL AND is_deleted = true 
               AND deleted_at <= :expiring_trash_cutoff 
               AND bundle_parent_id IS NULL) AS expiring_trash_count,

            -- [Khối 3.1] Tổng tài liệu cá nhân root & doc mới trong 7 ngày
            (SELECT COUNT(*) 
             FROM documents 
             WHERE owner_id = :uid AND workspace_id IS NULL AND is_deleted = false 
               AND is_public = false AND bundle_parent_id IS NULL) AS total_docs,
            (SELECT COUNT(*) 
             FROM documents 
             WHERE owner_id = :uid AND workspace_id IS NULL AND is_deleted = false 
               AND is_public = false AND bundle_parent_id IS NULL 
               AND created_at >= :new_docs_cutoff) AS new_docs_7d,

            -- [Khối 3.2] Dung lượng cá nhân đã dùng (chỉ tính bundle_parent_id IS NULL để tránh đếm đúp)
            (SELECT COALESCE(SUM(file_size), 0) 
             FROM documents 
             WHERE owner_id = :uid AND workspace_id IS NULL AND is_deleted = false 
               AND is_public = false AND bundle_parent_id IS NULL) AS storage_used_bytes,

            -- [Khối 3.3] Số tài liệu cá nhân đã đem chia sẻ vào các nhóm
            (SELECT COUNT(DISTINCT source_document_id) 
             FROM documents 
             WHERE owner_id = :uid AND workspace_id IS NOT NULL 
               AND source_document_id IS NOT NULL AND is_deleted = false) AS shared_docs_count,

            -- [Khối 3.4] Số tài liệu yêu thích chưa bị xóa
            (SELECT COUNT(*) 
             FROM favorites f 
             JOIN documents d ON f.document_id = d.id 
             WHERE f.user_id = :uid AND d.is_deleted = false) AS favorite_count,

            -- [Khối 3.5 & 8] Thống kê đóng góp học liệu
            (SELECT COUNT(*) 
             FROM community_submissions 
             WHERE submitter_id = :uid) AS contrib_total,
            (SELECT COUNT(*) 
             FROM community_submissions 
             WHERE submitter_id = :uid AND status = 'pending') AS contrib_pending,
            (SELECT COUNT(*) 
             FROM community_submissions 
             WHERE submitter_id = :uid AND status = 'approved') AS contrib_approved,
            (SELECT COUNT(*) 
             FROM community_submissions 
             WHERE submitter_id = :uid AND status = 'rejected') AS contrib_rejected,
            (SELECT COALESCE(SUM(ds.download_count), 0) 
             FROM community_submissions cs 
             JOIN document_stats ds ON cs.published_document_id = ds.document_id 
             WHERE cs.submitter_id = :uid AND cs.status = 'approved') AS contrib_approved_downloads,

            -- [Khối 7] Thống kê tổng số nhóm
            (SELECT COUNT(wm.workspace_id) 
             FROM workspace_members wm 
             JOIN workspaces w ON wm.workspace_id = w.id 
             WHERE wm.user_id = :uid AND w.is_deleted = false AND w.type = 'group') AS total_groups,
            (SELECT COUNT(wm.workspace_id) 
             FROM workspace_members wm 
             JOIN workspaces w ON wm.workspace_id = w.id 
             WHERE wm.user_id = :uid AND w.is_deleted = false AND w.type = 'group' AND w.owner_id = :uid) AS owned_groups,
            (SELECT COUNT(d.id) 
             FROM documents d 
             JOIN workspace_members wm ON d.workspace_id = wm.workspace_id 
             WHERE wm.user_id = :uid AND d.is_deleted = false AND d.bundle_parent_id IS NULL) AS total_group_docs;
    """)

    params = {
        "uid": user_id,
        "expiring_trash_cutoff": expiring_trash_cutoff,
        "rejected_cutoff": rejected_14d_cutoff,
        "new_docs_cutoff": new_docs_7d_cutoff,
    }

    summary_row = (await db.execute(summary_sql, params)).mappings().one()

    # Xử lý latest_rejected nếu có
    latest_rejected = None
    if summary_row["latest_rejected"]:
        raw_rej = summary_row["latest_rejected"]
        latest_rejected = RejectedSubmissionBrief(
            submission_id=raw_rej["submission_id"],
            title=raw_rej["title"],
            reason=raw_rej.get("reason"),
        )

    # ══════════════════════════════════════════════════════════
    # QUERY 2: TỐI ĐA 3 NHÓM MỚI CẬP NHẬT NHẤT (KÈM DOC & MEMBER COUNT)
    # ══════════════════════════════════════════════════════════
    groups_sql = text("""
        SELECT 
            w.id,
            w.name,
            w.owner_id,
            w.updated_at,
            w.created_at,
            wm.permission_level,
            COALESCE(m_cnt.cnt, 0) AS member_count,
            COALESCE(d_cnt.cnt, 0) AS document_count
        FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :uid
        LEFT JOIN (
            SELECT workspace_id, COUNT(*) AS cnt
            FROM workspace_members
            GROUP BY workspace_id
        ) m_cnt ON m_cnt.workspace_id = w.id
        LEFT JOIN (
            SELECT workspace_id, COUNT(*) AS cnt
            FROM documents
            WHERE is_deleted = false AND bundle_parent_id IS NULL
            GROUP BY workspace_id
        ) d_cnt ON d_cnt.workspace_id = w.id
        WHERE w.type = 'group' AND w.is_deleted = false
        ORDER BY w.updated_at DESC NULLS LAST, w.created_at DESC
        LIMIT 3;
    """)

    group_rows = (await db.execute(groups_sql, {"uid": user_id})).mappings().all()
    recent_groups = []
    for g in group_rows:
        role = "Trưởng nhóm" if g["owner_id"] == user_id else ("Cố vấn" if g["permission_level"] == "full" else "Thành viên")
        recent_groups.append(
            RecentGroupItem(
                id=g["id"],
                name=g["name"],
                role=role,
                member_count=g["member_count"],
                document_count=g["document_count"],
                updated_at=g["updated_at"] or g["created_at"],
            )
        )

    # ══════════════════════════════════════════════════════════
    # QUERY 3: TỐI ĐA 4 TÀI LIỆU CÁ NHÂN VỪA MỞ GẦN NHẤT
    # ══════════════════════════════════════════════════════════
    viewed_sql = text("""
        SELECT 
            d.id,
            d.title,
            d.file_type,
            d.is_bundle,
            COALESCE(child_cnt.cnt, 0) AS children_count,
            d.thumbnail_path,
            MAX(dl.created_at) AS last_viewed_at
        FROM download_logs dl
        JOIN documents d ON dl.document_id = d.id
        LEFT JOIN (
            SELECT bundle_parent_id, COUNT(*) AS cnt
            FROM documents
            WHERE is_deleted = false
            GROUP BY bundle_parent_id
        ) child_cnt ON child_cnt.bundle_parent_id = d.id
        WHERE dl.user_id = :uid 
          AND dl.action IN ('DOCUMENT_VIEWED', 'view')
          AND d.owner_id = :uid 
          AND d.workspace_id IS NULL 
          AND d.is_deleted = false
          AND d.bundle_parent_id IS NULL
        GROUP BY d.id, d.title, d.file_type, d.is_bundle, child_cnt.cnt, d.thumbnail_path
        ORDER BY last_viewed_at DESC
        LIMIT 4;
    """)

    viewed_rows = (await db.execute(viewed_sql, {"uid": user_id})).mappings().all()
    recent_viewed = [
        RecentViewedDocument(
            id=v["id"],
            title=v["title"],
            file_type=v["file_type"],
            is_bundle=v["is_bundle"],
            children_count=v["children_count"],
            thumbnail_path=v["thumbnail_path"],
            last_viewed_at=v["last_viewed_at"],
        )
        for v in viewed_rows
    ]

    # ══════════════════════════════════════════════════════════
    # QUERY 4: TỐI ĐA 6 HOẠT ĐỘNG GẦN ĐÂY NHẤT CỦA USER
    # ══════════════════════════════════════════════════════════
    activity_sql = text("""
        SELECT 
            dl.id,
            dl.action,
            dl.document_id,
            d.title AS document_title,
            dl.created_at
        FROM download_logs dl
        LEFT JOIN documents d ON dl.document_id = d.id
        WHERE dl.user_id = :uid
        ORDER BY dl.created_at DESC
        LIMIT 6;
    """)

    act_rows = (await db.execute(activity_sql, {"uid": user_id})).mappings().all()
    recent_activities = [
        RecentActivityItem(
            id=a["id"],
            action=a["action"],
            document_id=a["document_id"],
            document_title=a["document_title"],
            created_at=a["created_at"],
        )
        for a in act_rows
    ]

    return DashboardSummaryOut(
        pending_invitations=summary_row["pending_invitations"] or 0,
        pending_invitation_names=list(summary_row["pending_invitation_names"] or []),
        rejected_recent_count=summary_row["rejected_recent_count"] or 0,
        latest_rejected=latest_rejected,
        expiring_trash_count=summary_row["expiring_trash_count"] or 0,
        total_docs=summary_row["total_docs"] or 0,
        new_docs_7d=summary_row["new_docs_7d"] or 0,
        storage_used_bytes=summary_row["storage_used_bytes"] or 0,
        storage_quota_bytes=getattr(settings, "STORAGE_QUOTA_BYTES", 15 * 1024 * 1024 * 1024),
        shared_docs_count=summary_row["shared_docs_count"] or 0,
        favorite_count=summary_row["favorite_count"] or 0,
        contributions=ContributionStats(
            total=summary_row["contrib_total"] or 0,
            pending=summary_row["contrib_pending"] or 0,
            approved=summary_row["contrib_approved"] or 0,
            rejected=summary_row["contrib_rejected"] or 0,
            approved_downloads=summary_row["contrib_approved_downloads"] or 0,
        ),
        groups=GroupStats(
            total=summary_row["total_groups"] or 0,
            owned=summary_row["owned_groups"] or 0,
            total_docs=summary_row["total_group_docs"] or 0,
            recent=recent_groups,
        ),
        recent_viewed=recent_viewed,
        recent_activities=recent_activities,
    )
