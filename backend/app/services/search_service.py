from __future__ import annotations

import unicodedata
import urllib.parse
from sqlalchemy import select, or_, and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_tag import document_tags
from app.models.folder import Folder
from app.models.folder_tag import FolderTag
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.search import SearchResultItem

_VIETNAMESE_ACCENT_TABLE = str.maketrans({
    **{chr(i): None for i in range(0x0300, 0x0370)},
    "đ": "d",
    "Đ": "D",
    "ð": "d",
})


def remove_accents(s: str) -> str:
    if not s:
        return ""
    # Dùng NFD (thay vì NFKD) để giữ ánh xạ 1:1 vị trí ký tự khi có ký tự đặc biệt/ligature từ OCR (vd: ﬁ)
    return unicodedata.normalize("NFD", s).translate(_VIETNAMESE_ACCENT_TABLE)


def _format_file_type(file_type: str | None, file_path: str | None = None) -> str | None:
    if file_type:
        clean_ext = (
            file_type.split("/")[-1]
            .replace("vnd.openxmlformats-officedocument.wordprocessingml.document", "docx")
            .replace("vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx")
            .replace("vnd.openxmlformats-officedocument.presentationml.presentation", "pptx")
            .replace("msword", "doc")
            .replace("x-", "")
        )
        return clean_ext.upper()
    if file_path and "." in file_path:
        ext = file_path.rsplit(".", 1)[-1]
        if ext and len(ext) <= 5:
            return ext.upper()
    return None


def _scope_filter(model, user_id: int, accessible_ws_ids: list[int]):
    """Phân quyền chặt chẽ: kho cá nhân (workspace_id IS NULL & owner_id) HOẶC nhóm được phép."""
    conds = [and_(model.workspace_id.is_(None), model.owner_id == user_id)]
    if accessible_ws_ids:
        conds.append(and_(model.workspace_id.is_not(None), model.workspace_id.in_(accessible_ws_ids)))
    return or_(*conds)


def _build_doc_subtitle(base_label: str, doc: Document, folder_name: str | None = None) -> str:
    parts = [base_label]
    if folder_name:
        parts.append(f"Thư mục: {folder_name}")
    formatted_ext = _format_file_type(doc.file_type, doc.file_path)
    if formatted_ext:
        parts.append(formatted_ext)
    target_date = getattr(doc, "created_at", None)
    if target_date:
        parts.append(target_date.strftime("%d/%m/%Y"))
    return " • ".join(parts)


def extract_snippet(text: str | None, query: str, max_chars: int = 180) -> str | None:
    if not text:
        return None

    clean_text = " ".join(text.split())
    if not clean_text:
        return None

    if not query or not query.strip():
        return clean_text[:max_chars] + ("..." if len(clean_text) > max_chars else "")

    q_norm = remove_accents(query.lower().strip())
    t_norm = remove_accents(clean_text.lower())

    idx = t_norm.find(q_norm)
    match_len = len(q_norm)

    if idx == -1:
        terms = [t for t in q_norm.split() if len(t) > 1]
        for term in terms:
            pos = t_norm.find(term)
            if pos != -1:
                idx = pos
                match_len = len(term)
                break

    if idx == -1:
        return clean_text[:max_chars] + ("..." if len(clean_text) > max_chars else "")

    lead_chars = 40
    start = max(0, idx - lead_chars)
    if start > 0:
        space_idx = clean_text.find(" ", start)
        if space_idx != -1 and space_idx < idx:
            start = space_idx + 1

    end = min(len(clean_text), start + max_chars)
    if end < len(clean_text):
        space_idx = clean_text.rfind(" ", idx + match_len, end)
        if space_idx != -1 and space_idx > start:
            end = space_idx

    snippet = clean_text[start:end].strip()
    if start > 0:
        snippet = "..." + snippet
    if end < len(clean_text):
        snippet = snippet + "..."
    return snippet


class SearchService:
    @staticmethod
    async def _get_accessible_workspace_ids(db: AsyncSession, user_id: int) -> list[int]:
        # Tìm các nhóm mà user làm chủ hoặc là thành viên (DISTINCT tránh lặp ID khi nhóm có nhiều member)
        stmt = (
            select(Workspace.id)
            .distinct()
            .outerjoin(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(
                or_(
                    Workspace.owner_id == user_id,
                    WorkspaceMember.user_id == user_id,
                ),
                Workspace.is_deleted == False,
            )
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def quick_search(db: AsyncSession, query: str, user_id: int, limit: int = 5) -> list[SearchResultItem]:
        accessible_ws_ids = await SearchService._get_accessible_workspace_ids(db, user_id)
        search_pattern = f"%{query}%"
        results: list[SearchResultItem] = []

        # 1. TÌM KIẾM NHÓM (GROUPS) THEO TÊN
        if accessible_ws_ids:
            group_stmt = (
                select(Workspace)
                .where(
                    Workspace.type == "group",
                    Workspace.is_deleted == False,
                    Workspace.name.ilike(search_pattern),
                    Workspace.id.in_(accessible_ws_ids),
                )
                .limit(limit)
            )
            group_results = await db.execute(group_stmt)
            for group in group_results.scalars().all():
                results.append(SearchResultItem(
                    id=group.id,
                    type="workspace",
                    title=group.name,
                    subtitle="Nhóm làm việc",
                    url=f"/groups?highlight_group={group.id}",
                ))

        # 2. TÌM KIẾM THƯ MỤC (FOLDERS) TRONG KHO CÁ NHÂN VÀ NHÓM
        folder_scope = _scope_filter(Folder, user_id, accessible_ws_ids)
        folder_stmt = (
            select(Folder, Workspace.name.label("workspace_name"))
            .outerjoin(Workspace, Folder.workspace_id == Workspace.id)
            .where(Folder.name.ilike(search_pattern), folder_scope)
            .limit(limit)
        )
        folder_results = await db.execute(folder_stmt)
        for folder, workspace_name in folder_results.all():
            if folder.workspace_id:
                ws_label = workspace_name or f"Nhóm #{folder.workspace_id}"
                results.append(SearchResultItem(
                    id=folder.id,
                    type="group_folder",
                    title=folder.name,
                    subtitle=f"Thư mục • Nhóm: {ws_label}",
                    url=f"/groups/{folder.workspace_id}?tab=documents&folder={folder.id}",
                ))
            else:
                results.append(SearchResultItem(
                    id=folder.id,
                    type="personal_folder",
                    title=folder.name,
                    subtitle="Thư mục • Kho cá nhân",
                    url=f"/personal/documents?folder={folder.id}",
                ))

        # 3. TÌM KIẾM TÀI LIỆU (DOCUMENTS) TRONG KHO CÁ NHÂN VÀ NHÓM
        # Correlated scalar subquery trích xuất tên thư mục thông qua quan hệ tag (Document -> document_tags -> FolderTag -> Folder)
        folder_name_subq = (
            select(Folder.name)
            .select_from(Folder)
            .join(FolderTag, FolderTag.folder_id == Folder.id)
            .join(document_tags, document_tags.c.tag_id == FolderTag.tag_id)
            .where(document_tags.c.document_id == Document.id, folder_scope)
            .limit(1)
            .scalar_subquery()
        )

        doc_stmt = (
            select(
                Document,
                Workspace.name.label("workspace_name"),
                folder_name_subq.label("folder_name"),
            )
            .outerjoin(Workspace, Document.workspace_id == Workspace.id)
            .where(
                Document.title.ilike(search_pattern),
                Document.is_deleted == False,
                _scope_filter(Document, user_id, accessible_ws_ids),
            )
            .limit(limit)
        )

        doc_results = await db.execute(doc_stmt)
        for doc, workspace_name, folder_name in doc_results.all():
            if doc.workspace_id:
                ws_label = workspace_name or f"Nhóm #{doc.workspace_id}"
                base_label = f"Tài liệu • Nhóm: {ws_label}"
                doc_type = "group_doc"
                doc_url = f"/groups/{doc.workspace_id}?tab=documents&highlight_doc={doc.id}"
            else:
                base_label = "Tài liệu • Kho cá nhân"
                doc_type = "personal_doc"
                doc_url = f"/personal/documents?highlight_doc={doc.id}"

            results.append(SearchResultItem(
                id=doc.id,
                type=doc_type,
                title=doc.title,
                subtitle=_build_doc_subtitle(base_label, doc, folder_name),
                url=doc_url,
            ))

        return results

    @staticmethod
    async def full_text_search(db: AsyncSession, query: str, user_id: int, page: int = 1, page_size: int = 20):
        accessible_ws_ids = await SearchService._get_accessible_workspace_ids(db, user_id)

        # websearch_to_tsquery xử lý tốt các toán tử logic tự nhiên hơn plainto_tsquery; unaccent đảm bảo tìm kiếm không dấu
        ts_query = func.websearch_to_tsquery('simple', func.unaccent(query))
        where_clauses = (
            Document.is_deleted == False,
            Document.search_vector.bool_op('@@')(ts_query),
            _scope_filter(Document, user_id, accessible_ws_ids),
        )

        offset = (page - 1) * page_size
        paginated_stmt = (
            select(Document)
            .where(*where_clauses)
            .order_by(func.ts_rank(Document.search_vector, ts_query).desc())
            .limit(page_size)
            .offset(offset)
        )

        results = await db.execute(paginated_stmt)
        documents = results.scalars().all()

        # Tối ưu: ở trang 1 nếu số bản ghi < page_size thì tổng chính là len(documents), bỏ qua query COUNT thừa.
        # Ngược lại chạy COUNT phẳng trên Document.id thay vì wrap subquery chọn toàn bộ cột OCR.
        if page == 1 and len(documents) < page_size:
            total = len(documents)
        else:
            count_stmt = select(func.count(Document.id)).where(*where_clauses)
            total_count = await db.execute(count_stmt)
            total = total_count.scalar() or 0

        encoded_q = urllib.parse.quote(query)
        items = []
        for doc in documents:
            if doc.workspace_id:
                doc_type = "group_doc"
                base_label = f"Tài liệu • Nhóm #{doc.workspace_id}"
                doc_url = f"/groups/{doc.workspace_id}/documents/{doc.id}?tab=content&q={encoded_q}"
            else:
                doc_type = "personal_doc"
                base_label = "Tài liệu • Kho cá nhân"
                doc_url = f"/personal/documents/{doc.id}?tab=content&q={encoded_q}"

            snippet = extract_snippet(doc.content, query) or extract_snippet(doc.description, query)

            items.append(SearchResultItem(
                id=doc.id,
                type=doc_type,
                title=doc.title,
                subtitle=_build_doc_subtitle(base_label, doc),
                url=doc_url,
                snippet=snippet,
            ))

        return {"items": items, "total": total, "page": page, "page_size": page_size}


async def search_documents(
    db: AsyncSession,
    *,
    owner_id: int,
    workspace_id: int | None = None,
    query: str,
    limit: int = 20,
):
    # Chặn IDOR: xác thực quyền truy cập workspace trước khi tìm kiếm trong nhóm
    if workspace_id is not None:
        accessible_ws_ids = await SearchService._get_accessible_workspace_ids(db, owner_id)
        if workspace_id not in accessible_ws_ids:
            return []

    workspace_filter = "workspace_id = :workspace_id" if workspace_id is not None else "owner_id = :owner_id AND workspace_id IS NULL"

    sql = text(
        f"""
        SELECT *
        FROM documents
        WHERE is_deleted = false AND ({workspace_filter})
          AND (
            search_vector @@ websearch_to_tsquery('simple', unaccent(:query))
            OR unaccent(lower(title)) LIKE unaccent(lower(:like_query))
            OR unaccent(lower(coalesce(description, ''))) LIKE unaccent(lower(:like_query))
          )
        ORDER BY updated_at DESC
        LIMIT :limit
        """
    )

    result = await db.execute(
        sql,
        {
            "owner_id": owner_id,
            "workspace_id": workspace_id,
            "query": query,
            "like_query": f"%{query}%",
            "limit": limit,
        },
    )
    return result.mappings().all()
