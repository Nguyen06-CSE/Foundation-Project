# Document

> God node · 114 connections · `backend/app/models/document.py`

**Community:** [Community 15](Community_15.md)

## Connections by Relation

### calls
- create_document_from_upload() `EXTRACTED`
- test_list_documents_trending_sort_order() `EXTRACTED`
- share_document_to_group() `EXTRACTED`
- save_to_personal() `EXTRACTED`

### contains
- models/document.py `EXTRACTED`

### imports
- groups.py `EXTRACTED`
- documents.py `EXTRACTED`
- routers/library.py `EXTRACTED`
- models/user.py `EXTRACTED`
- seed_incremental.py `EXTRACTED`
- seed.py `EXTRACTED`
- models/__init__.py `EXTRACTED`
- models/workspace.py `EXTRACTED`
- scheduler.py `EXTRACTED`
- group_service.py `EXTRACTED`
- tags.py `EXTRACTED`
- document_service.py `EXTRACTED`
- models/tag.py `EXTRACTED`
- todos.py `EXTRACTED`
- file_service.py `EXTRACTED`
- download_log.py `EXTRACTED`
- trash.py `EXTRACTED`
- stats.py `EXTRACTED`
- folder_service.py `EXTRACTED`
- document_stats.py `EXTRACTED`
- *…and 13 more `imports` connection(s) not listed (lowest-degree first to go)*

### inherits
- [Base](Base.md) `EXTRACTED`
- TimestampMixin `EXTRACTED`

### uses
- _process_document_background() `INFERRED`
- submit_document_to_library() `INFERRED`
- seed_additional_data() `INFERRED`
- upload_batch_documents() `INFERRED`
- upload_group_batch_documents() `INFERRED`
- approve_submission() `INFERRED`
- get_community_document() `INFERRED`
- get_documents_by_subject() `INFERRED`
- reject_submission() `INFERRED`
- search_community_documents() `INFERRED`
- submit_documents_bulk_to_library() `INFERRED`
- add_files_to_bundle() `INFERRED`
- list_group_documents() `INFERRED`
- get_admin_submissions() `INFERRED`
- remove_file_if_unreferenced() `INFERRED`
- get_document() `INFERRED`
- list_documents() `INFERRED`
- upload_document() `INFERRED`
- get_group_document() `INFERRED`
- get_admin_submission_detail() `INFERRED`
- *…and 54 more `uses` connection(s) not listed (lowest-degree first to go)*

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*