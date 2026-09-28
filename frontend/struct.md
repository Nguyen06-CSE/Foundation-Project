```text
└── nguyen06-cse-foundation-project/
    ├── README.md
    ├── alembic.ini
    ├── package.json
    ├── .env.example
    ├── alembic/
    │   ├── README
    │   ├── env.py
    │   ├── script.py.mako
    │   └── versions/
    │       ├── 93f46eb359df_add_workspace_tags_table.py
    │       ├── dae4972dff87_init_full_db_elibrary.py
    │       └── f844331e6c1e_add_is_dissolving_and_dissolve_at_to_.py
    ├── backend/
    │   ├── PROGRESS.MD
    │   ├── requirements.txt
    │   ├── app/
    │   │   ├── __init__.py
    │   │   ├── main.py
    │   │   ├── core/
    │   │   │   ├── __init__.py
    │   │   │   ├── config.py
    │   │   │   ├── database.py
    │   │   │   ├── dependencies.py
    │   │   │   └── security.py
    │   │   ├── jobs/
    │   │   │   ├── __init__.py
    │   │   │   └── scheduler.py
    │   │   ├── models/
    │   │   │   ├── __init__.py
    │   │   │   ├── academic_class.py
    │   │   │   ├── base.py
    │   │   │   ├── category.py
    │   │   │   ├── classes.py
    │   │   │   ├── community_submission.py
    │   │   │   ├── document.py
    │   │   │   ├── document_rating.py
    │   │   │   ├── document_share.py
    │   │   │   ├── document_tag.py
    │   │   │   ├── document_version.py
    │   │   │   ├── download_log.py
    │   │   │   ├── faculty.py
    │   │   │   ├── favorite.py
    │   │   │   ├── folder.py
    │   │   │   ├── folder_tag.py
    │   │   │   ├── note.py
    │   │   │   ├── notification.py
    │   │   │   ├── processing_job.py
    │   │   │   ├── subject.py
    │   │   │   ├── tag.py
    │   │   │   ├── trash_batch.py
    │   │   │   ├── user.py
    │   │   │   ├── workspace.py
    │   │   │   ├── workspace_invitation.py
    │   │   │   ├── workspace_member.py
    │   │   │   └── workspace_tag.py
    │   │   ├── routers/
    │   │   │   ├── __init__.py
    │   │   │   ├── academic.py
    │   │   │   ├── auth.py
    │   │   │   ├── categories.py
    │   │   │   ├── document_versions.py
    │   │   │   ├── documents.py
    │   │   │   ├── download_logs.py
    │   │   │   ├── favorites.py
    │   │   │   ├── folders.py
    │   │   │   ├── groups.py
    │   │   │   ├── library.py
    │   │   │   ├── notes.py
    │   │   │   ├── notifications.py
    │   │   │   ├── search.py
    │   │   │   ├── tags.py
    │   │   │   ├── trash.py
    │   │   │   ├── users.py
    │   │   │   ├── workspace_tags.py
    │   │   │   └── workspaces.py
    │   │   ├── schemas/
    │   │   │   ├── __init__.py
    │   │   │   ├── academic.py
    │   │   │   ├── auth.py
    │   │   │   ├── category.py
    │   │   │   ├── document.py
    │   │   │   ├── favorite.py
    │   │   │   ├── folder.py
    │   │   │   ├── group.py
    │   │   │   ├── library.py
    │   │   │   ├── note.py
    │   │   │   ├── notification.py
    │   │   │   ├── search.py
    │   │   │   ├── tag.py
    │   │   │   ├── user.py
    │   │   │   ├── workspace.py
    │   │   │   └── workspace_tag.py
    │   │   ├── services/
    │   │   │   ├── document_service.py
    │   │   │   ├── file_processor.py
    │   │   │   ├── file_service.py
    │   │   │   ├── folder_service.py
    │   │   │   ├── group_service.py
    │   │   │   ├── search_service.py
    │   │   │   └── workspace_tag_service.py
    │   │   └── utils/
    │   │       └── checksum.py
    │   ├── db/
    │   │   ├── __init__.py
    │   │   ├── fix_passwords.py
    │   │   ├── seed.py
    │   │   ├── seed_inc_user.py
    │   │   ├── seed_incremental.py
    │   │   └── sync_group_schema.py
    │   ├── storage/
    │   │   └── 5/
    │   │       ├── 19aa521dbc8840d88e9ea90af6d050d0.pptx
    │   │       ├── 23cd2656f37c474bb1d4db3a505039ee.pptx
    │   │       ├── 43471d41c9e343acaa7049bac0f9135b.pptx
    │   │       ├── 4e0270a613f54751b22e8153f8d68370.pptx
    │   │       ├── d5e15211653f47d2895a43f68dd6374a.pptx
    │   │       └── dfa46e3d818e491caa99a690a30d27fb.pptx
    │   └── tests/
    │       ├── conftest.py
    │       ├── test_auth.py
    │       ├── test_categories_tags.py
    │       ├── test_documents.py
    │       └── test_search.py
    ├── database/
    │   └── README.MD
    ├── docs/
    │   ├── feat/
    │   │   ├── bundle/
    │   │   │   ├── README.md
    │   │   │   ├── API.md
    │   │   │   ├── BUSINESS_RULES.md
    │   │   │   ├── DATABASE.md
    │   │   │   └── FRONTEND.md
    │   │   └── community-library/
    │   │       ├── implementation.md
    │   │       └── spec.md
    │   ├── project-management/
    │   │   ├── mau-slide-thuyet-trinh.md
    │   │   ├── MoTaDuAn.MD
    │   │   ├── PhanRaChucNang.md
    │   │   └── PROJECT_STATUS_REPORT.md
    │   ├── references/
    │   │   └── sql/
    │   │       ├── AddModel.sql
    │   │       ├── DB_ELibrary.sql
    │   │       └── schemaForUserOffline.sql
    │   └── system-architecture/
    │       ├── architecture/
    │       │   ├── foundation-system-architecture.html
    │       │   ├── foundation-system-architecture.visual-check.html
    │       │   └── foundation-system-architecture.visual-check.json
    │       └── flow/
    │           ├── foundation-dataflow.html
    │           ├── foundation-dataflow.visual-check.html
    │           └── foundation-dataflow.visual-check.json
    ├── frontend/
    │   ├── AGENTS.md
    │   ├── package.json
    │   ├── requirements.txt
    │   ├── struct.md
    │   ├── digital-library/
    │   │   ├── README.md
    │   │   ├── components.json
    │   │   ├── index.html
    │   │   ├── package.json
    │   │   ├── tailwind.config.ts
    │   │   ├── tsconfig.app.json
    │   │   ├── tsconfig.json
    │   │   ├── tsconfig.node.json
    │   │   ├── vite.config.ts
    │   │   ├── .oxlintrc.json
    │   │   ├── @/
    │   │   │   ├── components/
    │   │   │   │   └── ui/
    │   │   │   │       └── button.tsx
    │   │   │   └── lib/
    │   │   │       └── utils.ts
    │   │   └── src/
    │   │       ├── App.css
    │   │       ├── App.tsx
    │   │       ├── index.css
    │   │       ├── main.tsx
    │   │       ├── components/
    │   │       │   ├── library/
    │   │       │   │   ├── FacultyCard.tsx
    │   │       │   │   ├── PublicLayout.tsx
    │   │       │   │   └── SubjectCard.tsx
    │   │       │   ├── shared/
    │   │       │   │   ├── AddToBundleModal.tsx
    │   │       │   │   ├── CardSkeleton.tsx
    │   │       │   │   ├── ContributeModal.tsx
    │   │       │   │   ├── CreateFolderModal.tsx
    │   │       │   │   ├── DocumentCard.tsx
    │   │       │   │   ├── DocumentContextMenu.tsx
    │   │       │   │   ├── DocumentDetail.tsx
    │   │       │   │   ├── DocumentFilterBar.tsx
    │   │       │   │   ├── DocumentListView.tsx
    │   │       │   │   ├── DocumentRow.tsx
    │   │       │   │   ├── DocumentTypeTabs.tsx
    │   │       │   │   ├── DynamicFilterDropdown.tsx
    │   │       │   │   ├── EditTagsModal.tsx
    │   │       │   │   ├── EmptyState.tsx
    │   │       │   │   ├── FileIcon.tsx
    │   │       │   │   ├── FolderCard.tsx
    │   │       │   │   ├── FolderContextMenu.tsx
    │   │       │   │   ├── Header.tsx
    │   │       │   │   ├── NotificationDropdown.tsx
    │   │       │   │   ├── PermissionBadge.tsx
    │   │       │   │   ├── ProcessingDonut.tsx
    │   │       │   │   ├── ProtectedRoute.tsx
    │   │       │   │   ├── RatingCard.tsx
    │   │       │   │   ├── RenameDocumentModal.tsx
    │   │       │   │   ├── SearchBar.tsx
    │   │       │   │   ├── Sidebar.tsx
    │   │       │   │   ├── StarRating.tsx
    │   │       │   │   ├── StatCard.tsx
    │   │       │   │   ├── TagDistribution.tsx
    │   │       │   │   ├── UploadModal.tsx
    │   │       │   │   ├── ViewToggle.tsx
    │   │       │   │   └── trash/
    │   │       │   │       ├── index.ts
    │   │       │   │       ├── MobileTrashBatch.tsx
    │   │       │   │       ├── TrashBatchRow.tsx
    │   │       │   │       ├── TrashConfirmModal.tsx
    │   │       │   │       ├── TrashEmptyState.tsx
    │   │       │   │       └── TrashStatCard.tsx
    │   │       │   └── ui/
    │   │       │       ├── Avatar.tsx
    │   │       │       ├── Badge.tsx
    │   │       │       ├── Button.tsx
    │   │       │       ├── Card.tsx
    │   │       │       ├── Dropdown.tsx
    │   │       │       ├── Input.tsx
    │   │       │       ├── ProgressBar.tsx
    │   │       │       └── Tag.tsx
    │   │       ├── constants/
    │   │       │   ├── fileTypeStyles.ts
    │   │       │   └── permissions.ts
    │   │       ├── hooks/
    │   │       │   ├── useAuth.ts
    │   │       │   ├── useDebounce.ts
    │   │       │   ├── useDocumentFilters.ts
    │   │       │   ├── useDocuments.ts
    │   │       │   ├── useGroupSpace.ts
    │   │       │   ├── useHighlightElement.ts
    │   │       │   ├── useRestoreSession.ts
    │   │       │   ├── useViewPreference.ts
    │   │       │   ├── useWorkspace.ts
    │   │       │   └── useWorkspaceOperations.ts
    │   │       ├── layouts/
    │   │       │   ├── AuthLayout.tsx
    │   │       │   └── MainLayout.tsx
    │   │       ├── mocks/
    │   │       │   ├── documents.ts
    │   │       │   ├── folders.ts
    │   │       │   ├── groups.ts
    │   │       │   ├── stats.ts
    │   │       │   └── workspaces.ts
    │   │       ├── pages/
    │   │       │   ├── auth/
    │   │       │   │   ├── LoginPage.tsx
    │   │       │   │   └── RegisterPage.tsx
    │   │       │   ├── class/
    │   │       │   │   └── ClassSpace.tsx
    │   │       │   ├── faculty/
    │   │       │   │   └── FacultySpace.tsx
    │   │       │   ├── group/
    │   │       │   │   ├── GroupDocumentDetailPage.tsx
    │   │       │   │   ├── GroupList.tsx
    │   │       │   │   ├── GroupSpace.tsx
    │   │       │   │   ├── components/
    │   │       │   │   │   ├── DocumentsTab.tsx
    │   │       │   │   │   ├── GroupDocumentCard.tsx
    │   │       │   │   │   ├── GroupDocumentContextMenu.tsx
    │   │       │   │   │   ├── GroupDocumentsSection.tsx
    │   │       │   │   │   ├── GroupFolderModalContainer.tsx
    │   │       │   │   │   ├── GroupSwitcher.tsx
    │   │       │   │   │   ├── GroupUploadModal.tsx
    │   │       │   │   │   ├── InviteModal.tsx
    │   │       │   │   │   ├── LocalGroupDocumentCard.tsx
    │   │       │   │   │   ├── MembersTab.tsx
    │   │       │   │   │   ├── NotificationCard.tsx
    │   │       │   │   │   ├── NotificationsTab.tsx
    │   │       │   │   │   ├── RequestsTab.tsx
    │   │       │   │   │   ├── SettingsTab.tsx
    │   │       │   │   │   ├── SimpleShareModal.tsx
    │   │       │   │   │   └── TrashTab.tsx
    │   │       │   │   ├── hooks/
    │   │       │   │   │   ├── useGroupData.ts
    │   │       │   │   │   ├── useGroupDocuments.ts
    │   │       │   │   │   ├── useGroupFilters.ts
    │   │       │   │   │   ├── useGroupFolders.ts
    │   │       │   │   │   └── useGroupSpace.ts
    │   │       │   │   └── types/
    │   │       │   │       └── groupSpace.types.ts
    │   │       │   ├── library/
    │   │       │   │   ├── LibraryDocumentDetail.tsx
    │   │       │   │   ├── LibraryFaculty.tsx
    │   │       │   │   ├── LibraryHome.tsx
    │   │       │   │   ├── LibrarySubject.tsx
    │   │       │   │   └── admin/
    │   │       │   │       └── LibraryAdminSubmissions.tsx
    │   │       │   ├── personal/
    │   │       │   │   ├── BundleDetailPage.tsx
    │   │       │   │   ├── FavoritesPage.tsx
    │   │       │   │   ├── PersonalDashboard.tsx
    │   │       │   │   ├── PersonalDocuments.tsx
    │   │       │   │   ├── PersonalHome.tsx
    │   │       │   │   ├── SharedWithMe.tsx
    │   │       │   │   ├── TrashPage.tsx
    │   │       │   │   ├── components/
    │   │       │   │   │   ├── DeleteFolderConfirmModal.tsx
    │   │       │   │   │   ├── PersonalDocumentsSection.tsx
    │   │       │   │   │   ├── PersonalFolderModalContainer.tsx
    │   │       │   │   │   ├── PersonalFoldersSection.tsx
    │   │       │   │   │   └── PersonalUploadModal.tsx
    │   │       │   │   └── hooks/
    │   │       │   │       ├── usePersonalDocuments.ts
    │   │       │   │       └── usePersonalFolders.ts
    │   │       │   ├── school/
    │   │       │   │   └── SchoolSpace.tsx
    │   │       │   ├── search/
    │   │       │   │   └── SearchPage.tsx
    │   │       │   ├── settings/
    │   │       │   │   └── SettingsPage.tsx
    │   │       │   ├── shared/
    │   │       │   │   └── DocumentBrowser.tsx
    │   │       │   ├── stats/
    │   │       │   │   └── StatsPage.tsx
    │   │       │   └── trash/
    │   │       │       └── TrashPage.tsx
    │   │       ├── services/
    │   │       │   ├── academicsService.ts
    │   │       │   ├── api.ts
    │   │       │   ├── authService.ts
    │   │       │   ├── documentService.ts
    │   │       │   ├── folderService.ts
    │   │       │   ├── groupService.ts
    │   │       │   ├── libraryService.ts
    │   │       │   ├── notificationService.ts
    │   │       │   ├── searchService.ts
    │   │       │   ├── tagService.ts
    │   │       │   ├── trashService.ts
    │   │       │   ├── userService.ts
    │   │       │   └── workspaceService.ts
    │   │       ├── stores/
    │   │       │   ├── authStore.ts
    │   │       │   ├── notificationStore.ts
    │   │       │   └── toastStore.ts
    │   │       ├── types/
    │   │       │   ├── document.ts
    │   │       │   ├── group.ts
    │   │       │   ├── library.ts
    │   │       │   ├── notification.ts
    │   │       │   ├── trash.ts
    │   │       │   ├── user.ts
    │   │       │   └── workspace.ts
    │   │       └── utils/
    │   │           ├── cn.ts
    │   │           ├── file.ts
    │   │           ├── fileIcon.ts
    │   │           ├── formatDate.ts
    │   │           ├── formatSize.ts
    │   │           ├── pdfBuilder.ts
    │   │           └── trashUtils.ts
    │   └── docs/
    │       ├── API_CONTRACTS.md
    │       ├── COMPONENTS.md
    │       ├── GROUP_LOGIC.md
    │       ├── SCREENS.md
    │       ├── design/
    │       │   ├── design-from-figma.md
    │       │   └── DESIGN_SYSTEM.md
    │       └── specs/
    │           └── COMMUNITY_LIBRARY.md
    └── .vite/
        └── deps/
            ├── _metadata.json
            └── package.json
```