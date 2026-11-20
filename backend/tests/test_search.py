import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from app.models.folder import Folder
from app.models.document import Document
from app.models.workspace import Workspace
from app.schemas.search import SearchResultItem
from app.services.search_service import SearchService, extract_snippet

def test_search_endpoint(client, monkeypatch):
    from app.routers import search as search_router

    async def fake_search_documents(db, *, owner_id, query, limit=20, **kwargs):
        return [{"id": 1, "title": "Kinh tế vi mô", "owner_id": owner_id}]

    monkeypatch.setattr(search_router, "search_documents", fake_search_documents)
    response = client.get("/search?q=kinh")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "Kinh tế vi mô"


@pytest.mark.asyncio
async def test_quick_search_sql_statements_enforce_permissions():
    """Kiểm tra và chứng minh câu SQL thực tế có filter phân quyền chặt chẽ trên compiled statement."""
    db = AsyncMock()
    executed_stmts = []

    async def capture_execute(stmt, *args, **kwargs):
        executed_stmts.append(stmt)
        res = MagicMock()
        res.scalars.return_value.all.return_value = []
        res.all.return_value = []
        return res

    db.execute.side_effect = capture_execute

    # 1. Kiểm tra statement của _get_accessible_workspace_ids
    user_id = 42
    await SearchService._get_accessible_workspace_ids(db, user_id=user_id)
    assert len(executed_stmts) == 1
    sql_ws = str(executed_stmts[0].compile(compile_kwargs={"literal_binds": True}))
    assert f"workspaces.owner_id = {user_id}" in sql_ws
    assert f"workspace_members.user_id = {user_id}" in sql_ws
    assert "workspaces.is_deleted = false" in sql_ws

    # 2. Kiểm tra các câu SQL sinh ra trong quick_search với accessible_ws_ids = [10, 20]
    executed_stmts.clear()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[10, 20])

    try:
        await SearchService.quick_search(db, "báo cáo", user_id=user_id, limit=5)
        assert len(executed_stmts) == 3

        # Query 1: Group query
        sql_group = str(executed_stmts[0].compile(compile_kwargs={"literal_binds": True}))
        assert "workspaces.type = 'group'" in sql_group
        assert "workspaces.is_deleted = false" in sql_group
        assert "workspaces.id IN (10, 20)" in sql_group
        assert "99" not in sql_group  # Nhóm 99 user không có quyền tuyệt đối không xuất hiện

        # Query 2: Folder query
        sql_folder = str(executed_stmts[1].compile(compile_kwargs={"literal_binds": True}))
        # Chỉ lấy folder cá nhân của đúng user (owner_id = 42) HOẶC folder trong nhóm được phép (10, 20)
        assert f"folders.workspace_id IS NULL AND folders.owner_id = {user_id}" in sql_folder
        assert "folders.workspace_id IS NOT NULL AND folders.workspace_id IN (10, 20)" in sql_folder

        # Query 3: Document query
        sql_doc = str(executed_stmts[2].compile(compile_kwargs={"literal_binds": True}))
        assert "documents.is_deleted = false" in sql_doc
        assert f"documents.workspace_id IS NULL AND documents.owner_id = {user_id}" in sql_doc
        assert "documents.workspace_id IS NOT NULL AND documents.workspace_id IN (10, 20)" in sql_doc
    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


@pytest.mark.asyncio
async def test_quick_search_service_distinguishes_same_title_and_ids():
    """Kiểm tra quick_search phân biệt rõ ràng các bản ghi trùng tiêu đề và trùng ID giữa các loại thực thể và trong kho cá nhân."""
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[10, 20])

    try:
        t1 = datetime(2026, 3, 12, 10, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 5, 18, 14, 30, 0, tzinfo=timezone.utc)

        group = Workspace(id=1, name="Đồ Án Cơ Sở", type="group", is_deleted=False, owner_id=1)
        p_folder = Folder(id=1, name="Báo cáo tuần", owner_id=1, workspace_id=None)
        g_folder = Folder(id=1, name="Báo cáo tuần", owner_id=2, workspace_id=10)

        # Hai tài liệu cá nhân cùng tên "Báo cáo tuần" nhưng khác folder, định dạng và thời gian
        p_doc1 = Document(id=1, title="Báo cáo tuần", owner_id=1, workspace_id=None, file_path="bc.docx", file_type="docx", created_at=t1, checksum="c1")
        p_doc2 = Document(id=2, title="Báo cáo tuần", owner_id=1, workspace_id=None, file_path="bc.pdf", file_type="pdf", created_at=t2, checksum="c2")
        g_doc = Document(id=3, title="Báo cáo tuần", owner_id=3, workspace_id=10, file_path="bc_g.docx", file_type="docx", created_at=t1, checksum="c3")

        mock_groups = MagicMock()
        mock_groups.scalars.return_value.all.return_value = [group]

        mock_folders = MagicMock()
        mock_folders.all.return_value = [(p_folder, None), (g_folder, "Nhóm K44")]

        mock_docs = MagicMock()
        mock_docs.all.return_value = [
            (p_doc1, None, "Kỳ 1"),       # p_doc1 nằm trong thư mục "Kỳ 1"
            (p_doc2, None, None),         # p_doc2 không nằm trong thư mục nào
            (g_doc, "Nhóm K44", "Chung")  # g_doc nằm trong nhóm K44, thư mục "Chung"
        ]

        db.execute.side_effect = [mock_groups, mock_folders, mock_docs]

        items = await SearchService.quick_search(db, "báo cáo", user_id=1)

        assert len(items) == 6

        # Đảm bảo mỗi item có định danh type + id duy nhất
        unique_keys = {f"{item.type}-{item.id}" for item in items}
        assert len(unique_keys) == 6

        # Hai tài liệu cá nhân cùng tên được phân biệt rõ ràng bởi subtitle
        doc1_item = next(i for i in items if i.type == "personal_doc" and i.id == 1)
        doc2_item = next(i for i in items if i.type == "personal_doc" and i.id == 2)
        assert doc1_item.subtitle == "Tài liệu • Kho cá nhân • Thư mục: Kỳ 1 • DOCX • 12/03/2026"
        assert doc2_item.subtitle == "Tài liệu • Kho cá nhân • PDF • 18/05/2026"
        assert doc1_item.subtitle != doc2_item.subtitle

        # Tài liệu nhóm
        g_doc_item = next(i for i in items if i.type == "group_doc" and i.id == 3)
        assert g_doc_item.subtitle == "Tài liệu • Nhóm: Nhóm K44 • Thư mục: Chung • DOCX • 12/03/2026"
        assert g_doc_item.url == "/groups/10?tab=documents&highlight_doc=3"

        # Folder cá nhân và nhóm
        pf_item = next(i for i in items if i.type == "personal_folder")
        gf_item = next(i for i in items if i.type == "group_folder")
        assert pf_item.url == "/personal/documents?folder=1"
        assert gf_item.url == "/groups/10?tab=documents&folder=1"

    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


@pytest.mark.asyncio
async def test_quick_search_no_accessible_workspaces():
    """Kiểm tra khi user không thuộc nhóm nào, chỉ tìm kiếm trong kho cá nhân."""
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[])

    try:
        p_folder = Folder(id=5, name="Tài liệu cá nhân", owner_id=1, workspace_id=None)
        p_doc = Document(id=8, title="Ghi chú cá nhân", owner_id=1, workspace_id=None, file_path="n.pdf", file_type="pdf", checksum="c8")

        mock_folders = MagicMock()
        mock_folders.all.return_value = [(p_folder, None)]

        mock_docs = MagicMock()
        mock_docs.all.return_value = [(p_doc, None, None)]

        # Chỉ có 2 câu lệnh được thực thi (folders và docs cá nhân), không gọi query nhóm
        db.execute.side_effect = [mock_folders, mock_docs]

        items = await SearchService.quick_search(db, "cá nhân", user_id=1)

        assert len(items) == 2
        assert items[0].type == "personal_folder"
        assert items[0].url == "/personal/documents?folder=5"
        assert items[1].type == "personal_doc"
        assert items[1].url == "/personal/documents?highlight_doc=8"
        assert db.execute.call_count == 2

    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


def test_quick_search_api_endpoint(client, monkeypatch):
    """Kiểm tra endpoint API /search/quick trả đúng response_model QuickSearchOut với đủ các loại kết quả."""
    async def fake_quick_search(db, query, user_id, limit=5):
        return [
            SearchResultItem(
                id=1,
                type="workspace",
                title="Nhóm 1",
                subtitle="Nhóm làm việc",
                url="/groups?highlight_group=1"
            ),
            SearchResultItem(
                id=2,
                type="personal_folder",
                title="Bài giảng",
                subtitle="Thư mục • Kho cá nhân",
                url="/personal/documents?folder=2"
            ),
            SearchResultItem(
                id=3,
                type="group_folder",
                title="Bài tập",
                subtitle="Thư mục • Nhóm: Nhóm 1",
                url="/groups/1?tab=documents&folder=3"
            ),
            SearchResultItem(
                id=4,
                type="group_doc",
                title="Đề thi.docx",
                subtitle="Tài liệu • Nhóm: Nhóm 1",
                url="/groups/1?tab=documents&highlight_doc=4"
            )
        ]

    monkeypatch.setattr(SearchService, "quick_search", fake_quick_search)
    response = client.get("/search/quick?q=test")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 4

    types = [item["type"] for item in data["items"]]
    assert types == ["workspace", "personal_folder", "group_folder", "group_doc"]
    assert data["items"][1]["url"] == "/personal/documents?folder=2"
    assert data["items"][2]["url"] == "/groups/1?tab=documents&folder=3"


# ---------------------------------------------------------------------------
# Task 4: extract_snippet unit tests
# ---------------------------------------------------------------------------

def test_extract_snippet_basic():
    text = "Đây là báo cáo tốt nghiệp của sinh viên Trần Thị B."
    result = extract_snippet(text, "báo cáo")
    assert result is not None
    assert "báo cáo" in result or "Báo cáo" in result or "BÁO CÁO" in result or "báo" in result.lower()


def test_extract_snippet_no_accent_query_matches_accented_text():
    """Query không dấu vẫn tìm được đoạn văn có dấu."""
    text = "BÁO CÁO TỐT NGHIỆP ĐỀ TÀI: XÂY DỰNG HỆ THỐNG QUẢN LÝ THƯ VIỆN SỐ"
    result = extract_snippet(text, "bao cao tot nghiep")
    assert result is not None
    assert len(result) > 0


def test_extract_snippet_multiword():
    text = "Chương 1: Tổng quan về hệ thống quản lý tài liệu số trong môi trường giáo dục đại học."
    result = extract_snippet(text, "quản lý tài liệu")
    assert result is not None
    assert "quản lý" in result or "tài liệu" in result


def test_extract_snippet_no_match_returns_beginning():
    text = "Nội dung không liên quan tới từ khóa."
    result = extract_snippet(text, "xyz không tồn tại")
    assert result is not None
    # Should return start of content
    assert result.startswith("Nội dung")


def test_extract_snippet_empty_content():
    assert extract_snippet(None, "bất kỳ") is None
    assert extract_snippet("", "bất kỳ") is None
    assert extract_snippet("   ", "bất kỳ") is None


# ---------------------------------------------------------------------------
# Task 4: full_text_search service tests (mocked DB, no Postgres required)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_full_text_search_url_has_tab_and_query():
    """URL của kết quả FTS phải trỏ đến route detail với tab=content và q= được encode."""
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[5])

    try:
        personal_doc = Document(
            id=10, title="Luận văn tốt nghiệp", owner_id=1, workspace_id=None,
            file_path="lv.pdf", file_type="application/pdf", checksum="cA",
            content="Chương 1: Tổng quan về đề tài luận văn tốt nghiệp ngành CNTT.",
        )
        group_doc = Document(
            id=11, title="Đề cương chi tiết", owner_id=2, workspace_id=5,
            file_path="dc.pdf", file_type="application/pdf", checksum="cB",
            content="Nội dung đề cương chi tiết của môn học kỳ 1.",
        )

        mock_paginated = MagicMock()
        mock_paginated.scalars.return_value.all.return_value = [personal_doc, group_doc]

        mock_count = MagicMock()
        mock_count.scalar.return_value = 2

        db.execute.side_effect = [mock_paginated, mock_count]

        result = await SearchService.full_text_search(db, "luận văn", user_id=1)

        assert result["total"] == 2
        items = result["items"]
        assert len(items) == 2

        # Personal doc URL must route to personal detail page with tab=content
        p_item = next(i for i in items if i.id == 10)
        assert p_item.type == "personal_doc"
        assert "/personal/documents/10" in p_item.url
        assert "tab=content" in p_item.url
        assert "luận" in p_item.url or "lu" in p_item.url  # q= param encoded

        # Group doc URL must route to group detail page
        g_item = next(i for i in items if i.id == 11)
        assert g_item.type == "group_doc"
        assert "/groups/5/documents/11" in g_item.url
        assert "tab=content" in g_item.url

        # Snippets must be extracted from content
        assert p_item.snippet is not None
        assert g_item.snippet is not None

    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


@pytest.mark.asyncio
async def test_full_text_search_no_ocr_snippet_falls_back_to_description():
    """Khi content rỗng, snippet lấy từ description."""
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[])

    try:
        doc = Document(
            id=20, title="Tài liệu không có OCR", owner_id=1, workspace_id=None,
            file_path="f.pdf", file_type="application/pdf", checksum="cC",
            content=None,
            description="Tài liệu tham khảo về quản trị cơ sở dữ liệu.",
        )

        mock_paginated = MagicMock()
        mock_paginated.scalars.return_value.all.return_value = [doc]
        mock_count = MagicMock()
        mock_count.scalar.return_value = 1
        db.execute.side_effect = [mock_paginated, mock_count]

        result = await SearchService.full_text_search(db, "quản trị", user_id=1)
        item = result["items"][0]
        # snippet should fall back to description
        assert item.snippet is not None
        assert "quản trị" in item.snippet or "cơ sở dữ liệu" in item.snippet

    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


@pytest.mark.asyncio
async def test_full_text_search_permission_boundary():
    """FTS SQL phải dùng (workspace_id IS NULL AND owner_id=user) OR (workspace_id IS NOT NULL AND workspace_id IN ...)
    — không được dùng plain owner_id == user_id vì sẽ lộ tài liệu nhóm không thuộc quyền.
    """
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[3])

    try:
        # --- Phần 1: kết quả trả về đúng ---
        accessible_doc = Document(
            id=30, title="Tài liệu nhóm 3", owner_id=5, workspace_id=3,
            file_path="g.pdf", file_type="application/pdf", checksum="cD",
            content="Nội dung thuộc nhóm 3.",
        )
        mock_paginated = MagicMock()
        mock_paginated.scalars.return_value.all.return_value = [accessible_doc]
        mock_count = MagicMock()
        mock_count.scalar.return_value = 1
        db.execute.side_effect = [mock_paginated, mock_count]

        result = await SearchService.full_text_search(db, "nhóm 3", user_id=1)
        assert len(result["items"]) == 1
        assert result["items"][0].id == 30

        # --- Phần 2: kiểm tra SQL predicate ---
        executed_stmts = []

        async def capture(stmt, *a, **kw):
            executed_stmts.append(stmt)
            mock_r = MagicMock()
            mock_r.scalars.return_value.all.return_value = []
            mock_r.scalar.return_value = 0
            return mock_r

        db.execute.side_effect = capture
        await SearchService.full_text_search(db, "nhóm 3", user_id=1)
        assert len(executed_stmts) >= 1

        # str(stmt) renders the ORM clause tree including column names and IS NULL / IS NOT NULL.
        # Avoids literal_binds which cannot serialize REGCONFIG ('simple').
        sql = str(executed_stmts[0])

        # Must have both scoped branches — not bare owner_id equality without workspace guard.
        # Exact phrases produced by SQLAlchemy ORM for the two and_() conditions:
        assert "documents.workspace_id IS NULL AND documents.owner_id = " in sql, \
            "Personal scope must use workspace_id IS NULL AND owner_id ="
        assert "documents.workspace_id IS NOT NULL AND documents.workspace_id IN" in sql, \
            "Group scope must use workspace_id IS NOT NULL AND workspace_id IN"
        assert "documents.is_deleted = false" in sql

    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


@pytest.mark.asyncio
async def test_full_text_search_empty_accessible_ws_ids_no_broad_query():
    """Khi user không thuộc nhóm nào, FTS chỉ tìm trong kho cá nhân, không tạo workspace_id IN ()."""
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[])

    try:
        executed_stmts = []

        async def capture(stmt, *a, **kw):
            executed_stmts.append(stmt)
            mock_r = MagicMock()
            mock_r.scalars.return_value.all.return_value = []
            mock_r.scalar.return_value = 0
            return mock_r

        db.execute.side_effect = capture
        await SearchService.full_text_search(db, "kinh tế", user_id=7)

        sql = str(executed_stmts[0])
        # Only personal scope when no workspaces
        assert "documents.workspace_id IS NULL" in sql
        # Must NOT have IN () which would be invalid SQL
        assert "IN ()" not in sql
        # Group branch (IS NOT NULL) should NOT appear when accessible_ws_ids is empty
        assert "documents.workspace_id IS NOT NULL" not in sql

    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


@pytest.mark.asyncio
async def test_full_text_search_distinguishes_same_title_documents():
    """FTS phân biệt rõ các tài liệu cùng tiêu đề thông qua subtitle (định dạng, ngày tạo, kho) và snippet."""
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[])

    try:
        t1 = datetime(2026, 1, 10, 8, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 2, 20, 9, 30, 0, tzinfo=timezone.utc)

        doc1 = Document(
            id=101, title="Báo cáo thực tập", owner_id=1, workspace_id=None,
            file_path="bc1.pdf", file_type="application/pdf", checksum="c101",
            content="Sinh viên Nguyễn Văn A thực tập tại công ty FPT Software.",
            created_at=t1,
        )
        doc2 = Document(
            id=102, title="Báo cáo thực tập", owner_id=1, workspace_id=None,
            file_path="bc2.docx", file_type="docx", checksum="c102",
            content="Sinh viên Trần Thị B thực tập tại ngân hàng Vietcombank.",
            created_at=t2,
        )

        mock_paginated = MagicMock()
        mock_paginated.scalars.return_value.all.return_value = [doc1, doc2]
        mock_count = MagicMock()
        mock_count.scalar.return_value = 2
        db.execute.side_effect = [mock_paginated, mock_count]

        result = await SearchService.full_text_search(db, "thực tập", user_id=1)
        items = result["items"]
        assert len(items) == 2

        item1 = next(i for i in items if i.id == 101)
        item2 = next(i for i in items if i.id == 102)

        # Tiêu đề giống nhau nhưng subtitle và snippet khác nhau
        assert item1.title == item2.title
        assert item1.subtitle == "Tài liệu • Kho cá nhân • PDF • 10/01/2026"
        assert item2.subtitle == "Tài liệu • Kho cá nhân • DOCX • 20/02/2026"
        assert item1.subtitle != item2.subtitle
        assert "FPT" in item1.snippet
        assert "Vietcombank" in item2.snippet

    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


def test_extract_snippet_preserves_index_with_ocr_ligatures():
    """Ký tự ligature từ OCR (vd: ﬁ) không làm lệch vị trí cắt snippet khi dùng NFD."""
    prefix = "ﬁ " * 120
    text = f"{prefix}Nội dung cần tìm kiếm là phân tích dữ liệu lớn."
    result = extract_snippet(text, "phân tích dữ liệu")
    assert result is not None
    assert "phân tích dữ liệu" in result


@pytest.mark.asyncio
async def test_search_documents_blocks_unauthorized_workspace():
    """Chặn IDOR: user không thuộc workspace_id thì trả về [] và không truy vấn bảng documents."""
    from app.services.search_service import search_documents

    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[1, 2])
    try:
        rows = await search_documents(db, owner_id=7, workspace_id=999, query="mật")
        assert rows == []
        db.execute.assert_not_called()
    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces


@pytest.mark.asyncio
async def test_full_text_search_skips_count_on_partial_first_page():
    """Trang 1 trả về < page_size bản ghi thì không cần chạy query COUNT thứ 2; trang đầy thì vẫn chạy COUNT phẳng."""
    db = AsyncMock()
    original_get_workspaces = SearchService._get_accessible_workspace_ids
    SearchService._get_accessible_workspace_ids = AsyncMock(return_value=[])
    try:
        doc = Document(
            id=201, title="Test", owner_id=1, workspace_id=None,
            file_path="a.pdf", file_type="application/pdf", checksum="c201", content="Nội dung mẫu",
        )
        mock_paginated = MagicMock()
        mock_paginated.scalars.return_value.all.return_value = [doc]
        db.execute.return_value = mock_paginated

        res1 = await SearchService.full_text_search(db, "mẫu", user_id=1, page=1, page_size=20)
        assert res1["total"] == 1
        assert db.execute.call_count == 1

        # Khi trang đầy (len == page_size), phải chạy query COUNT phẳng (không subquery)
        db.execute.reset_mock()
        executed_stmts = []

        async def capture(stmt, *a, **kw):
            executed_stmts.append(stmt)
            r = MagicMock()
            r.scalars.return_value.all.return_value = [doc]
            r.scalar.return_value = 5
            return r

        db.execute.side_effect = capture
        res2 = await SearchService.full_text_search(db, "mẫu", user_id=1, page=1, page_size=1)
        assert res2["total"] == 5
        assert len(executed_stmts) == 2
        count_sql = str(executed_stmts[1])
        assert "count(documents.id)" in count_sql
        assert "anon_1" not in count_sql
    finally:
        SearchService._get_accessible_workspace_ids = original_get_workspaces

