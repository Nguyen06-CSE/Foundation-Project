# Community 15

> 42 nodes · cohesion 0.09

## Key Concepts

- **Document** (114 connections) — `backend/app/models/document.py`
- **scheduler.py** (39 connections) — `backend/app/jobs/scheduler.py`
- **DownloadLog** (32 connections) — `backend/app/models/download_log.py`
- **document_service.py** (30 connections) — `backend/app/services/document_service.py`
- **DocumentStats** (22 connections) — `backend/app/models/document_stats.py`
- **DocumentVersion** (15 connections) — `backend/app/models/document_version.py`
- **seed_activity_heat.py** (14 connections) — `backend/db/seed_activity_heat.py`
- **remove_file_if_unreferenced()** (12 connections) — `backend/app/services/file_service.py`
- **dissolve_workspace()** (8 connections) — `backend/app/jobs/scheduler.py`
- **register_jobs()** (8 connections) — `backend/app/jobs/scheduler.py`
- **log_activity()** (8 connections) — `backend/app/services/document_service.py`
- **test_activity_sorting.py** (8 connections) — `backend/tests/test_activity_sorting.py`
- **refresh_document_stats()** (7 connections) — `backend/app/jobs/scheduler.py`
- **hard_delete_document()** (7 connections) — `backend/app/routers/trash.py`
- **get_document_versions()** (6 connections) — `backend/app/routers/document_versions.py`
- **_do_log_activity()** (6 connections) — `backend/app/services/document_service.py`
- **AsyncSession** (6 connections)
- **pytest** (6 connections)
- **copy_file()** (5 connections) — `backend/app/services/group_service.py`
- **seed_activity_heat()** (5 connections) — `backend/db/seed_activity_heat.py`
- **cleanup_deleted_documents()** (4 connections) — `backend/app/jobs/scheduler.py`
- **cleanup_orphaned_documents()** (4 connections) — `backend/app/jobs/scheduler.py`
- **execute_group_dissolution()** (4 connections) — `backend/app/jobs/scheduler.py`
- **remind_due_todos()** (4 connections) — `backend/app/jobs/scheduler.py`
- **add_document_version()** (4 connections) — `backend/app/services/document_service.py`
- *... and 17 more nodes in this community*

## Relationships

- [Community 5](Community_5.md) (71 shared connections)
- [Community 9](Community_9.md) (46 shared connections)
- [Community 3](Community_3.md) (33 shared connections)
- [Community 1](Community_1.md) (31 shared connections)
- [Community 12](Community_12.md) (27 shared connections)
- [Community 16](Community_16.md) (8 shared connections)
- [Community 36](Community_36.md) (6 shared connections)
- [Community 35](Community_35.md) (6 shared connections)
- [Community 24](Community_24.md) (5 shared connections)
- [Community 51](Community_51.md) (3 shared connections)
- [Community 50](Community_50.md) (3 shared connections)
- [Community 13](Community_13.md) (2 shared connections)

## Source Files

- `backend/app/jobs/scheduler.py`
- `backend/app/models/document.py`
- `backend/app/models/document_stats.py`
- `backend/app/models/document_version.py`
- `backend/app/models/download_log.py`
- `backend/app/routers/document_versions.py`
- `backend/app/routers/trash.py`
- `backend/app/services/document_service.py`
- `backend/app/services/file_service.py`
- `backend/app/services/group_service.py`
- `backend/db/seed_activity_heat.py`
- `backend/tests/test_activity_sorting.py`
- `backend/tests/test_new_features.py`

## Audit Trail

- EXTRACTED: 214 (65%)
- INFERRED: 115 (35%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*