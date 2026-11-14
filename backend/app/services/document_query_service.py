# backend/app/services/document_query_service.py

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_stats import DocumentStats
from app.models.document_tag import document_tags
from app.models.folder import Folder
from app.models.folder_tag import FolderTag
from app.models.tag import Tag
from app.models.download_log import DownloadLog
from app.constants.activity_actions import ActivityAction
from app.schemas.document import DocumentOut

CODE_EXTENSIONS = [
    "py", "js", "ts", "jsx", "tsx", "cpp", "c", "h", "java", "cs",
    "go", "rs", "php", "rb", "swift", "kt", "scala", "r", "m",
    "sql", "json", "yaml", "yml", "toml", "xml", "csv",
    "html", "css", "scss", "sass", "less", "svelte", "vue",
    "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
    "md", "mdx", "rst", "tex"
]

class DocumentQueryService:
    """
    Dịch vụ truy vấn và lọc tài liệu phía máy chủ (Server-side Filtering & Pagination).
    Hỗ trợ cả kho cá nhân và nhóm làm việc, tích hợp:
    - Tìm kiếm đa trường (tên, nhãn dán, nội dung bundle con)
    - Phân trang offset ổn định kèm 'has_more' (không chạy count(*) lặp lại không cần thiết)
    - Bộ lọc thư mục theo tag
    - Bộ lọc danh mục (tab: pdf, image, document, code, other)
    - Bộ lọc thời gian tải lên
    """

    @classmethod
    async def query_documents(
        cls,
        db: AsyncSession,
        current_user_id: int,
        *,
        scope: str = "personal",
        workspace_id: Optional[int] = None,
        folder_id: Optional[int] = None,
        q: Optional[str] = None,
        tag_id: Optional[int] = None,
        category: Optional[str] = None,
        file_type: Optional[str] = None,
        uploaded_within: Optional[str] = None,
        sort: str = "trending",
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        fetch_limit = page_size + 1

        # 1. Base Query
        query = (
            select(Document, DocumentStats)
            .outerjoin(DocumentStats, DocumentStats.document_id == Document.id)
            .options(selectinload(Document.tags), selectinload(Document.owner))
        )

        if scope == "personal":
            query = query.where(
                Document.owner_id == current_user_id,
                Document.workspace_id == workspace_id if workspace_id is not None else Document.workspace_id.is_(None),
                Document.is_deleted == False,
                Document.is_public == False,
                Document.bundle_parent_id.is_(None),
            )
        else:  # group
            query = query.where(
                Document.workspace_id == workspace_id,
                Document.is_deleted == False,
                Document.bundle_parent_id.is_(None),
            )

        # 2. Bộ lọc Thư mục (Folder) theo cơ chế Tag
        if folder_id is not None:
            ft_res = await db.execute(
                select(FolderTag.tag_id).where(FolderTag.folder_id == folder_id)
            )
            f_tag_ids = [r[0] for r in ft_res.all()]
            if f_tag_ids:
                # Thuộc folder nếu mang bất kỳ tag nào của folder
                query = query.where(
                    Document.id.in_(
                        select(document_tags.c.document_id).where(
                            document_tags.c.tag_id.in_(f_tag_ids)
                        )
                    )
                )
            else:
                # Folder rỗng tag -> Không có tài liệu nào khớp
                return {
                    "items": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": 0,
                    "has_more": False,
                }

        # 3. Bộ lọc Tag (kèm Bundle rule 2.4: hiện bundle nếu con khớp)
        if tag_id is not None:
            doc_has_tag = Document.id.in_(
                select(document_tags.c.document_id).where(document_tags.c.tag_id == tag_id)
            )
            bundle_has_tag_child = Document.id.in_(
                select(Document.bundle_parent_id).where(
                    Document.bundle_parent_id.is_not(None),
                    Document.is_deleted == False,
                    Document.id.in_(
                        select(document_tags.c.document_id).where(document_tags.c.tag_id == tag_id)
                    )
                )
            )
            query = query.where(or_(doc_has_tag, bundle_has_tag_child))

        # 4. Tìm kiếm từ khóa `q` (kèm Bundle rule 2.4)
        if q:
            search_str = f"%{q.strip().lower()}%"
            # Khớp tên tài liệu hoặc tên nhãn
            doc_matches_q = or_(
                func.lower(Document.title).like(search_str),
                Document.id.in_(
                    select(document_tags.c.document_id)
                    .join(Tag, Tag.id == document_tags.c.tag_id)
                    .where(func.lower(Tag.name).like(search_str))
                )
            )
            # Khớp con của bundle
            bundle_matches_child_q = Document.id.in_(
                select(Document.bundle_parent_id).where(
                    Document.bundle_parent_id.is_not(None),
                    Document.is_deleted == False,
                    or_(
                        func.lower(Document.title).like(search_str),
                        Document.id.in_(
                            select(document_tags.c.document_id)
                            .join(Tag, Tag.id == document_tags.c.tag_id)
                            .where(func.lower(Tag.name).like(search_str))
                        )
                    )
                )
            )
            query = query.where(or_(doc_matches_q, bundle_matches_child_q))

        ft_col = func.coalesce(func.lower(Document.file_type), "")
        fp_col = func.coalesce(func.lower(Document.file_path), "")

        # 5. Bộ lọc Loại file theo Dropdown `file_type`
        if file_type:
            clean_ft = file_type.strip().lower()
            query = query.where(
                or_(
                    ft_col == clean_ft,
                    ft_col.like(f"%{clean_ft}%"),
                    fp_col.like(f"%.{clean_ft}"),
                )
            )

        # 6. Bộ lọc Category (Tab)
        if category and category != "all":
            cat = category.strip().lower()
            if cat == "pdf":
                query = query.where(
                    or_(
                        ft_col.like("%pdf%"),
                        fp_col.like("%.pdf"),
                    )
                )
            elif cat == "image":
                query = query.where(
                    or_(
                        ft_col.like("image/%"),
                        *[fp_col.like(f"%.{ext}") for ext in ["jpg", "jpeg", "png", "webp", "svg", "gif"]],
                    )
                )
            elif cat == "document":
                doc_exts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"]
                query = query.where(
                    or_(
                        ft_col.like("%word%"),
                        ft_col.like("%presentation%"),
                        ft_col.like("%spreadsheet%"),
                        *[fp_col.like(f"%.{ext}") for ext in doc_exts],
                    )
                )
            elif cat == "code":
                query = query.where(
                    or_(*[fp_col.like(f"%.{ext}") for ext in CODE_EXTENSIONS])
                )
            elif cat == "other":
                known_conditions = [
                    ft_col.like("%pdf%"),
                    fp_col.like("%.pdf"),
                    ft_col.like("image/%"),
                    *[fp_col.like(f"%.{ext}") for ext in ["jpg", "jpeg", "png", "webp", "svg", "gif"]],
                    ft_col.like("%word%"),
                    ft_col.like("%presentation%"),
                    ft_col.like("%spreadsheet%"),
                    *[fp_col.like(f"%.{ext}") for ext in ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"]],
                    *[fp_col.like(f"%.{ext}") for ext in CODE_EXTENSIONS],
                ]
                query = query.where(~or_(*known_conditions))

        # 7. Bộ lọc Thời gian tải lên `uploaded_within`
        if uploaded_within:
            uw = uploaded_within.strip().lower()
            now = datetime.now()
            start_of_today = datetime(now.year, now.month, now.day)
            if uw == "today":
                query = query.where(Document.created_at >= start_of_today)
            elif uw == "last_7_days":
                query = query.where(Document.created_at >= start_of_today - timedelta(days=7))
            elif uw == "last_30_days":
                query = query.where(Document.created_at >= start_of_today - timedelta(days=30))
            elif uw == "this_year":
                query = query.where(Document.created_at >= datetime(now.year, 1, 1))

        # 8. Tính total chỉ ở trang 1 (tránh count(*) đắt đỏ ở các trang sau)
        total = 0
        if page == 1:
            count_query = select(func.count()).select_from(query.subquery())
            total = (await db.execute(count_query)).scalar() or 0

        # 9. Sắp xếp (Sort) có khóa phụ id.desc() đảm bảo ổn định
        if sort == "newest":
            query = query.order_by(Document.created_at.desc(), Document.id.desc())
        elif sort == "views":
            query = query.order_by(
                func.coalesce(DocumentStats.view_count, 0).desc(),
                Document.created_at.desc(),
                Document.id.desc(),
            )
        elif sort == "title":
            query = query.order_by(Document.title.asc(), Document.id.desc())
        else:  # "trending"
            query = query.order_by(
                func.coalesce(DocumentStats.trending_score, 0.0).desc(),
                Document.id.desc(),
            )

        # 10. Truy vấn dữ liệu với limit = page_size + 1 để xác định has_more
        query = query.offset(offset).limit(fetch_limit)
        result = await db.execute(query)
        rows = result.all()

        has_more = len(rows) > page_size
        items_rows = rows[:page_size]
        items = [doc for doc, _ in items_rows]

        # 11. Hydrate bundle_children_count
        bundle_ids = [d.id for d in items if d.is_bundle]
        counts_map = {}
        if bundle_ids:
            counts_res = await db.execute(
                select(Document.bundle_parent_id, func.count(Document.id))
                .where(Document.bundle_parent_id.in_(bundle_ids), Document.is_deleted == False)
                .group_by(Document.bundle_parent_id)
            )
            counts_map = dict(counts_res.all())

        # 12. Hydrate personal_views_map
        doc_ids = [d.id for d in items]
        personal_views_map = {}
        if doc_ids:
            p_res = await db.execute(
                select(DownloadLog.document_id, func.count(DownloadLog.id))
                .where(
                    DownloadLog.document_id.in_(doc_ids),
                    DownloadLog.user_id == current_user_id,
                    DownloadLog.action.in_([ActivityAction.VIEWED, "view"]),
                )
                .group_by(DownloadLog.document_id)
            )
            personal_views_map = dict(p_res.all())

        # 13. Map kết quả sang DocumentOut
        items_out = []
        for doc, stats in items_rows:
            doc_out = DocumentOut.model_validate(doc)
            if doc.is_bundle:
                doc_out.bundle_children_count = counts_map.get(doc.id, 0)
            doc_out.trending_score = float(stats.trending_score) if stats else 0.0
            doc_out.view_count = int(stats.view_count) if stats else 0
            doc_out.download_count = int(stats.download_count) if stats else 0
            doc_out.share_count = int(stats.share_count) if stats else 0
            doc_out.personal_view_count = int(personal_views_map.get(doc.id, 0))
            items_out.append(doc_out)

        total_pages = (total + page_size - 1) // page_size if total > 0 and page_size > 0 else 1

        return {
            "items": items_out,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_more": has_more,
        }
