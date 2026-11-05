# Workspace

> God node · 52 connections · `backend/app/models/workspace.py`

**Community:** [Community 5](Community_5.md)

## Connections by Relation

### contains
- models/workspace.py `EXTRACTED`

### imports
- groups.py `EXTRACTED`
- documents.py `EXTRACTED`
- routers/library.py `EXTRACTED`
- models/user.py `EXTRACTED`
- seed_incremental.py `EXTRACTED`
- seed.py `EXTRACTED`
- models/__init__.py `EXTRACTED`
- models/document.py `EXTRACTED`
- scheduler.py `EXTRACTED`
- folders.py `EXTRACTED`
- group_service.py `EXTRACTED`
- workspace_tags.py `EXTRACTED`
- models/tag.py `EXTRACTED`
- todos.py `EXTRACTED`
- download_log.py `EXTRACTED`
- faculty.py `EXTRACTED`
- workspace_member.py `EXTRACTED`
- academic_class.py `EXTRACTED`
- workspace_invitation.py `EXTRACTED`
- trash_batch.py `EXTRACTED`
- *…and 4 more `imports` connection(s) not listed (lowest-degree first to go)*

### inherits
- [Base](Base.md) `EXTRACTED`
- TimestampMixin `EXTRACTED`

### method
- .__repr__() `EXTRACTED`

### uses
- require_full_permission() `INFERRED`
- require_member() `INFERRED`
- require_owner() `INFERRED`
- verify_workspace_access() `INFERRED`
- submit_documents_bulk_to_library() `INFERRED`
- get_workspace_or_404() `INFERRED`
- SearchService `INFERRED`
- get_document_activities() `INFERRED`
- list_members() `INFERRED`
- dissolve_workspace() `INFERRED`
- accept_invitation() `INFERRED`
- list_groups() `INFERRED`
- list_todos() `INFERRED`
- _to_todo_out() `INFERRED`
- create_group() `INFERRED`
- seed_workspaces_and_members() `INFERRED`
- seed_workspaces_and_members() `INFERRED`
- _role_for() `INFERRED`
- get_group() `INFERRED`
- leave_group() `INFERRED`
- *…and 4 more `uses` connection(s) not listed (lowest-degree first to go)*

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*