# Community 27

> 24 nodes · cohesion 0.22

## Key Concepts

- **dashboard_service.py** (21 connections) — `backend/app/services/dashboard_service.py`
- **schemas/dashboard.py** (13 connections) — `backend/app/schemas/dashboard.py`
- **get_dashboard_summary()** (11 connections) — `backend/app/services/dashboard_service.py`
- **DashboardSummaryOut** (10 connections) — `backend/app/schemas/dashboard.py`
- **test_dashboard.py** (10 connections) — `backend/tests/test_dashboard.py`
- **ContributionStats** (9 connections) — `backend/app/schemas/dashboard.py`
- **GroupStats** (9 connections) — `backend/app/schemas/dashboard.py`
- **BaseModel** (7 connections)
- **test_dashboard_summary_bundle_counting()** (7 connections) — `backend/tests/test_dashboard.py`
- **read_dashboard_summary()** (6 connections) — `backend/app/routers/dashboard.py`
- **test_dashboard_summary_empty_user()** (6 connections) — `backend/tests/test_dashboard.py`
- **mock_get_summary()** (5 connections) — `backend/tests/test_dashboard.py`
- **RecentActivityItem** (4 connections) — `backend/app/schemas/dashboard.py`
- **RecentGroupItem** (4 connections) — `backend/app/schemas/dashboard.py`
- **RecentViewedDocument** (4 connections) — `backend/app/schemas/dashboard.py`
- **RejectedSubmissionBrief** (4 connections) — `backend/app/schemas/dashboard.py`
- **mock_get_summary()** (4 connections) — `backend/tests/test_dashboard.py`
- **trash_constants.py** (1 connections) — `backend/app/constants/trash_constants.py`
- **AsyncSession** (1 connections)
- **get** (1 connections)
- **Trả về toàn bộ số liệu thống kê tổng hợp cho trang cá nhân (/personal): - Dải…** (1 connections) — `backend/app/routers/dashboard.py`
- **AsyncSession** (1 connections)
- **Kiểm tra endpoint GET /dashboard/summary với user mới tinh (không có dữ liệu):…** (1 connections) — `backend/tests/test_dashboard.py`
- **Kiểm tra logic bundle: User có 1 bundle cha và 2 file con -> total_docs = 1…** (1 connections) — `backend/tests/test_dashboard.py`

## Relationships

- [Community 5](Community_5.md) (7 shared connections)
- [Community 12](Community_12.md) (5 shared connections)
- [Community 3](Community_3.md) (5 shared connections)
- [Community 15](Community_15.md) (2 shared connections)
- [Community 13](Community_13.md) (1 shared connections)
- [Community 29](Community_29.md) (1 shared connections)

## Source Files

- `backend/app/constants/trash_constants.py`
- `backend/app/routers/dashboard.py`
- `backend/app/schemas/dashboard.py`
- `backend/app/services/dashboard_service.py`
- `backend/tests/test_dashboard.py`

## Audit Trail

- EXTRACTED: 77 (95%)
- INFERRED: 4 (5%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*