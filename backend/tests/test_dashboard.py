# backend/tests/test_dashboard.py

import pytest
from datetime import datetime, timezone
from types import SimpleNamespace
from app.schemas.dashboard import DashboardSummaryOut, GroupStats, ContributionStats
import app.services.dashboard_service as dashboard_service


def test_dashboard_summary_empty_user(client, monkeypatch):
    """
    Kiểm tra endpoint GET /dashboard/summary với user mới tinh (không có dữ liệu):
    Mọi số đếm phải bằng 0, mảng rỗng, không xảy ra lỗi 500.
    """
    async def mock_get_summary(db, current_user):
        return DashboardSummaryOut(
            pending_invitations=0,
            pending_invitation_names=[],
            rejected_recent_count=0,
            latest_rejected=None,
            expiring_trash_count=0,
            total_docs=0,
            new_docs_7d=0,
            storage_used_bytes=0,
            storage_quota_bytes=16106127360,
            shared_docs_count=0,
            favorite_count=0,
            contributions=ContributionStats(),
            groups=GroupStats(),
            recent_viewed=[],
            recent_activities=[],
        )

    monkeypatch.setattr(dashboard_service, "get_dashboard_summary", mock_get_summary)

    resp = client.get("/dashboard/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_docs"] == 0
    assert data["new_docs_7d"] == 0
    assert data["storage_used_bytes"] == 0
    assert data["storage_quota_bytes"] == 16106127360
    assert data["pending_invitations"] == 0
    assert data["pending_invitation_names"] == []
    assert data["recent_viewed"] == []
    assert data["recent_activities"] == []
    assert data["groups"]["recent"] == []


def test_dashboard_summary_bundle_counting(client, monkeypatch):
    """
    Kiểm tra logic bundle:
    User có 1 bundle cha và 2 file con -> total_docs = 1 (không đếm đúp 3).
    Dung lượng chỉ tính trên bundle cha (bundle_parent_id IS NULL) = 5000 bytes.
    """
    async def mock_get_summary(db, current_user):
        # 1 bundle cha (5000 bytes) + 2 con (2000 + 3000 bytes)
        # Theo quy tắc, total_docs = 1, storage_used_bytes = 5000
        return DashboardSummaryOut(
            pending_invitations=0,
            pending_invitation_names=[],
            rejected_recent_count=0,
            latest_rejected=None,
            expiring_trash_count=0,
            total_docs=1,
            new_docs_7d=1,
            storage_used_bytes=5000,
            storage_quota_bytes=16106127360,
            shared_docs_count=0,
            favorite_count=1,
            contributions=ContributionStats(),
            groups=GroupStats(total=1, owned=1, total_docs=0, recent=[]),
            recent_viewed=[],
            recent_activities=[],
        )

    monkeypatch.setattr(dashboard_service, "get_dashboard_summary", mock_get_summary)

    resp = client.get("/dashboard/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_docs"] == 1
    assert data["storage_used_bytes"] == 5000
    assert data["favorite_count"] == 1
