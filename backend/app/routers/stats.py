# backend/app/routers/stats.py
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.activity_actions import ActivityAction
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.download_log import DownloadLog
from app.models.user import User
from app.schemas.activity import ActivityLogResponse, MyStatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


def _topic_rows(groups):
    return [{"name": name, "personal_documents": sum(x["workspace_id"] is None for x in group),
             "read_views": sum(x["views"] for x in group),
             "read_documents": sum(x["views"] > 0 for x in group),
             "opened_from_search": sum(x["search_views"] > 0 for x in group)}
            for name, group in groups]


def _tag_topic_rows(rows):
    from collections import defaultdict
    groups = defaultdict(list)
    seen = set()
    for row in rows:
        key = (row["workspace_id"], row["name"].casefold())
        document_key = (*key, row["id"])
        if document_key in seen:
            continue
        seen.add(document_key)
        groups[key].append(row)
    topics = []
    for (workspace_id, _), group in groups.items():
        topic = _topic_rows([(group[0]["name"], group)])[0]
        topic["scope"] = "personal" if workspace_id is None else "group"
        topic["workspace_id"] = workspace_id
        topics.append(topic)
    return topics


@router.get("/me", response_model=MyStatsResponse)
async def get_my_stats(
    scope: str = Query("me", pattern="^(me|my_documents)$"),
    days: int = Query(30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Thống kê tổng quan cho người dùng:
    - scope="me" (mặc định): Thống kê hoạt động của bản thân user (tài liệu đã tải lên, số lượt xem, số lượt tải của tôi)
    - scope="my_documents": Thống kê tương tác của người khác trên các tài liệu do user tải lên
    """
    if days not in (7, 30):
        raise HTTPException(status_code=422, detail="days must be 7 or 30")

    # 1. Total uploads (active documents owned by current_user)
    total_uploads = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.owner_id == current_user.id,
                Document.is_deleted == False,
            )
        )
    ).scalar() or 0

    # 2. Total views & downloads
    if scope == "my_documents":
        total_views = (
            await db.execute(
                select(func.count(DownloadLog.id))
                .join(Document, DownloadLog.document_id == Document.id)
                .where(
                    Document.owner_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.VIEWED, "view"]),
                )
            )
        ).scalar() or 0

        total_downloads = (
            await db.execute(
                select(func.count(DownloadLog.id))
                .join(Document, DownloadLog.document_id == Document.id)
                .where(
                    Document.owner_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.DOWNLOADED, "download"]),
                )
            )
        ).scalar() or 0
    else:
        total_views = (
            await db.execute(
                select(func.count(DownloadLog.id)).where(
                    DownloadLog.user_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.VIEWED, "view"]),
                )
            )
        ).scalar() or 0

        total_downloads = (
            await db.execute(
                select(func.count(DownloadLog.id)).where(
                    DownloadLog.user_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.DOWNLOADED, "download"]),
                )
            )
        ).scalar() or 0

    # 3. Recent 20 activities
    recent_query = (
        select(DownloadLog, User.full_name, User.username, Document.title)
        .outerjoin(User, DownloadLog.user_id == User.id)
        .outerjoin(Document, DownloadLog.document_id == Document.id)
    )
    if scope == "my_documents":
        recent_query = recent_query.where(Document.owner_id == current_user.id)
    else:
        recent_query = recent_query.where(DownloadLog.user_id == current_user.id)

    recent_query = recent_query.order_by(DownloadLog.created_at.desc()).limit(20)
    recent_rows = (await db.execute(recent_query)).all()

    recent_activities = [
        ActivityLogResponse(
            id=log.id,
            document_id=log.document_id,
            user_id=log.user_id,
            action=log.action,
            workspace_context=log.workspace_context,
            workspace_id=log.workspace_id,
            extra_data=log.extra_data or {},
            created_at=log.created_at,
            actor_name=full_name or username or "Unknown",
            document_title=doc_title,
        )
        for log, full_name, username, doc_title in recent_rows
    ]

    # 4. Activity by day (last 30 days)
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=29)).date()

    by_day_query = (
        select(
            func.date(DownloadLog.created_at).label("log_date"),
            func.count(DownloadLog.id).label("count"),
        )
    )
    if scope == "my_documents":
        by_day_query = by_day_query.join(Document, DownloadLog.document_id == Document.id).where(
            Document.owner_id == current_user.id,
            func.date(DownloadLog.created_at) >= start_date,
        )
    else:
        by_day_query = by_day_query.where(
            DownloadLog.user_id == current_user.id,
            func.date(DownloadLog.created_at) >= start_date,
        )

    by_day_query = by_day_query.group_by(func.date(DownloadLog.created_at))
    by_day_rows = (await db.execute(by_day_query)).all()

    daily_map = {str(r.log_date): r.count for r in by_day_rows}

    activity_by_day = [
        {
            "date": (start_date + timedelta(days=i)).isoformat(),
            "count": daily_map.get((start_date + timedelta(days=i)).isoformat(), 0),
        }
        for i in range(30)
    ]

    interests = None
    if scope == "me":
        # One row per document/topic prevents multiple tags from multiplying read counts.
        rows = (await db.execute(text("""
            WITH visible AS (
              SELECT d.id,d.subject_id,d.owner_id,d.workspace_id
              FROM documents d WHERE NOT d.is_deleted
                AND ((d.workspace_id IS NULL AND d.owner_id=:uid)
                  OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id=d.workspace_id
                    AND w.type='group' AND NOT w.is_deleted AND
                    (w.owner_id=:uid OR EXISTS (SELECT 1 FROM workspace_members m
                      WHERE m.workspace_id=w.id AND m.user_id=:uid))))
            ), reads AS (
              SELECT dl.document_id,count(*) AS views,
                     count(*) FILTER (WHERE dl.extra_data->>'source'='search') AS search_views
              FROM download_logs dl WHERE dl.user_id=:uid
                AND dl.action IN ('DOCUMENT_VIEWED','view') AND dl.created_at>=:since
              GROUP BY dl.document_id
            )
            SELECT d.id,d.owner_id,d.workspace_id,d.subject_id,s.name AS subject_name,
                   f.id AS faculty_id,f.name AS faculty_name,
                   coalesce(r.views,0) AS views,coalesce(r.search_views,0) AS search_views
            FROM visible d LEFT JOIN reads r ON r.document_id=d.id
            LEFT JOIN subjects s ON s.id=d.subject_id LEFT JOIN faculties f ON f.id=s.faculty_id
            WHERE (d.workspace_id IS NULL AND d.owner_id=:uid) OR r.views>0
        """), {"uid": current_user.id, "since": now - timedelta(days=days)})).mappings().all()

        from collections import defaultdict
        subject_groups = defaultdict(list)
        faculty_groups = defaultdict(list)
        for row in rows:
            subject_groups[row["subject_name"] or "Chưa phân loại"].append(row)
            faculty_groups[row["faculty_name"] or "Chưa phân loại"].append(row)
        tag_rows = (await db.execute(text("""
            WITH visible AS (
              SELECT d.id,d.owner_id,d.workspace_id
              FROM documents d WHERE NOT d.is_deleted AND
                ((d.workspace_id IS NULL AND d.owner_id=:uid)
                  OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id=d.workspace_id
                    AND w.type='group' AND NOT w.is_deleted AND
                    (w.owner_id=:uid OR EXISTS (SELECT 1 FROM workspace_members m
                      WHERE m.workspace_id=w.id AND m.user_id=:uid))))
            ), reads AS (
              SELECT dl.document_id,count(*) AS views,
                     count(*) FILTER (WHERE dl.extra_data->>'source'='search') AS search_views
              FROM download_logs dl WHERE dl.user_id=:uid
                AND dl.action IN ('DOCUMENT_VIEWED','view') AND dl.created_at>=:since
              GROUP BY dl.document_id
            )
            SELECT DISTINCT ON (d.workspace_id,lower(t.name),d.id)
                   t.name,d.id,d.workspace_id,coalesce(r.views,0) AS views,
                   coalesce(r.search_views,0) AS search_views
            FROM visible d JOIN document_tags dt ON dt.document_id=d.id
            JOIN tags t ON t.id=dt.tag_id
            LEFT JOIN workspace_tags wt ON wt.workspace_id=d.workspace_id AND wt.tag_id=t.id
            LEFT JOIN reads r ON r.document_id=d.id
            WHERE ((d.workspace_id IS NULL AND t.workspace_id IS NULL AND t.owner_id=:uid)
                OR (d.workspace_id IS NOT NULL AND (wt.id IS NOT NULL OR t.workspace_id=d.workspace_id)))
              AND ((d.workspace_id IS NULL AND d.owner_id=:uid) OR coalesce(r.views,0)>0)
            ORDER BY d.workspace_id,lower(t.name),d.id,t.id
        """), {"uid": current_user.id, "since": now - timedelta(days=days)})).mappings().all()
        tag_topics = _tag_topic_rows(tag_rows)
        interests = {"days": days,
                     "personal_documents": sum(r["workspace_id"] is None for r in rows),
                     "read_views": sum(r["views"] for r in rows),
                     "read_documents": sum(r["views"] > 0 for r in rows),
                     "opened_from_search": sum(r["search_views"] > 0 for r in rows),
                     "subjects": _topic_rows(subject_groups.items()),
                     "faculties": _topic_rows(faculty_groups.items()),
                     "tags": tag_topics}

    return MyStatsResponse(
        total_uploads=total_uploads,
        total_views=total_views,
        total_downloads=total_downloads,
        recent_activities=recent_activities,
        activity_by_day=activity_by_day,
        interests=interests,
    )
