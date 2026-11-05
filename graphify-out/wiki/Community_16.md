# Community 16

> 36 nodes · cohesion 0.12

## Key Concepts

- **seed_incremental.py** (62 connections) — `backend/db/seed_incremental.py`
- **FolderTag** (24 connections) — `backend/app/models/folder_tag.py`
- **Favorite** (14 connections) — `backend/app/models/favorite.py`
- **seed_additional_data()** (14 connections) — `backend/db/seed_incremental.py`
- **get_or_create()** (11 connections) — `backend/db/seed_incremental.py`
- **AsyncSession** (11 connections)
- **DocumentShare** (9 connections) — `backend/app/models/document_share.py`
- **seed_database()** (9 connections) — `backend/db/seed_incremental.py`
- **seed_documents()** (9 connections) — `backend/db/seed_incremental.py`
- **seed_interactions()** (9 connections) — `backend/db/seed_incremental.py`
- **create_default_folders_for_user()** (8 connections) — `backend/app/services/folder_service.py`
- **compute_file_checksum()** (8 connections) — `backend/app/utils/checksum.py`
- **load_base_data()** (8 connections) — `backend/db/seed_incremental.py`
- **hashlib** (8 connections)
- **checksum.py** (7 connections) — `backend/app/utils/checksum.py`
- **seed_workspaces_and_members()** (7 connections) — `backend/db/seed_incremental.py`
- **add_favorite()** (6 connections) — `backend/app/routers/favorites.py`
- **seed_classifications()** (6 connections) — `backend/db/seed_incremental.py`
- **seed_folders()** (6 connections) — `backend/db/seed_incremental.py`
- **list_favorites()** (5 connections) — `backend/app/routers/favorites.py`
- **remove_favorite()** (5 connections) — `backend/app/routers/favorites.py`
- **get_one()** (5 connections) — `backend/db/seed_incremental.py`
- **get_or_create_m2m()** (5 connections) — `backend/db/seed_incremental.py`
- **seed_trash_batches()** (5 connections) — `backend/db/seed_incremental.py`
- **generate_checksum()** (4 connections) — `backend/db/seed_incremental.py`
- *... and 11 more nodes in this community*

## Relationships

- [Community 5](Community_5.md) (61 shared connections)
- [Community 3](Community_3.md) (15 shared connections)
- [Community 12](Community_12.md) (9 shared connections)
- [Community 15](Community_15.md) (8 shared connections)
- [Community 35](Community_35.md) (7 shared connections)
- [Community 19](Community_19.md) (7 shared connections)
- [Community 1](Community_1.md) (6 shared connections)
- [Community 9](Community_9.md) (4 shared connections)
- [Community 13](Community_13.md) (3 shared connections)
- [Community 4](Community_4.md) (3 shared connections)
- [Community 29](Community_29.md) (2 shared connections)

## Source Files

- `backend/app/models/document_share.py`
- `backend/app/models/favorite.py`
- `backend/app/models/folder_tag.py`
- `backend/app/routers/favorites.py`
- `backend/app/services/folder_service.py`
- `backend/app/utils/checksum.py`
- `backend/db/seed_incremental.py`

## Audit Trail

- EXTRACTED: 155 (77%)
- INFERRED: 47 (23%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*