import asyncio
import hashlib
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession

# Thiết lập đường dẫn để import module app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import AsyncSessionLocal

# Models
from app.models.faculty import Faculty
from app.models.academic_class import Class
from app.models.user import User
from app.models.category import Category
from app.models.tag import Tag
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workspace_invitation import WorkspaceInvitation
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.document_tag import document_tags
from app.models.note import Note
from app.models.trash_batch import TrashBatch
from app.models.document_share import DocumentShare
from app.models.notification import Notification
from app.models.favorite import Favorite
from app.models.download_log import DownloadLog
from app.models.processing_job import ProcessingJob


# =========================================================
# HELPERS
# =========================================================
def generate_checksum(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


async def get_one(session: AsyncSession, model, **filters):
    """Tìm một record theo các field dùng làm khóa tự nhiên."""
    stmt = select(model).filter_by(**filters)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_or_create(
    session: AsyncSession,
    model,
    lookup: dict,
    values: Optional[dict] = None,
):
    """
    Idempotent insert:
    - Có record theo lookup -> trả về record cũ, KHÔNG update.
    - Chưa có -> insert và flush để lấy id.
    """
    obj = await get_one(session, model, **lookup)
    if obj is not None:
        return obj, False

    payload = {**lookup, **(values or {})}
    obj = model(**payload)
    session.add(obj)
    await session.flush()
    return obj, True


async def get_or_create_m2m(
    session: AsyncSession,
    table,
    lookup: dict,
):
    """
    Idempotent insert cho bảng trung gian Many-to-Many.
    Không cần ORM model riêng.
    """
    where_clause = [table.c[key] == value for key, value in lookup.items()]
    stmt = select(table).where(*where_clause)
    result = await session.execute(stmt)

    if result.first() is not None:
        return False

    await session.execute(insert(table).values(**lookup))
    return True


def require(value, description: str):
    if value is None:
        raise RuntimeError(
            f"Không tìm thấy dữ liệu nền bắt buộc: {description}. "
            "Hãy seed/kiểm tra mục 1-3 trước khi chạy seed incremental."
        )
    return value


# =========================================================
# 0. LOAD EXISTING BASE DATA
#    KHÔNG seed Faculties / Classes / Users
# =========================================================
async def load_base_data(session: AsyncSession):
    print("Loading existing faculties, classes and users...")

    faculty_rows = {}
    for code in ["CNTT", "KT", "NN"]:
        faculty = await get_one(session, Faculty, code=code)
        faculty_rows[code] = require(faculty, f"Faculty(code='{code}')")

    class_rows = {}
    for code in ["K65-CNTT1", "K65-CNTT2", "K65-KT1"]:
        academic_class = await get_one(session, Class, code=code)
        class_rows[code] = require(academic_class, f"Class(code='{code}')")

    user_rows = {}
    usernames = [
        "sysadmin",
        "schooladmin",
        "admin_cntt",
        "gv_tuan",
        "gv_mai",
        "sv_an",
        "sv_binh",
        "sv_cuong",
        "sv_dung",
    ]
    for username in usernames:
        user = await get_one(session, User, username=username)
        user_rows[username] = require(user, f"User(username='{username}')")

    return faculty_rows, class_rows, user_rows


# =========================================================
# 4. SEED WORKSPACES, MEMBERS, INVITATIONS
# =========================================================
async def seed_workspaces_and_members(
    session: AsyncSession,
    users,
    faculties,
    classes,
):
    print("4. Seeding Workspaces, Members, and Invitations...")

    # ----- Workspaces -----
    workspace_specs = [
        {
            "lookup": {"type": "faculty", "name": "Không gian Khoa CNTT"},
            "values": {
                "description": "Tài liệu chung của Khoa Công nghệ Thông tin",
                "owner_id": users["admin_cntt"].id,
                "ref_faculty_id": faculties["CNTT"].id,
                "default_member_permission": "view",
            },
        },
        {
            "lookup": {"type": "class", "name": "Lớp K65 CNTT 1"},
            "values": {
                "description": "Không gian học tập lớp K65 CNTT 1",
                "owner_id": users["gv_tuan"].id,
                "ref_class_id": classes["K65-CNTT1"].id,
                "default_member_permission": "view",
            },
        },
        {
            "lookup": {"type": "group", "name": "Nhóm Đồ án Web"},
            "values": {
                "description": "Làm đồ án Web",
                "owner_id": users["sv_an"].id,
                "default_member_permission": "full",
            },
        },
        {
            "lookup": {"type": "faculty", "name": "Không gian Khoa Kinh tế"},
            "values": {
                "description": "Tài liệu chung của Khoa Kinh tế",
                "owner_id": users["gv_mai"].id,
                "ref_faculty_id": faculties["KT"].id,
                "default_member_permission": "view",
            },
        },
        {
            "lookup": {"type": "group", "name": "Nhóm Ôn thi Python"},
            "values": {
                "description": "Nhóm ôn tập Python và lập trình",
                "owner_id": users["sv_binh"].id,
                "default_member_permission": "view",
            },
        },
    ]

    workspaces = {}
    for spec in workspace_specs:
        ws, created = await get_or_create(
            session,
            Workspace,
            spec["lookup"],
            spec["values"],
        )
        workspaces[spec["lookup"]["name"]] = ws
        print(
            f"  {'INSERT' if created else 'SKIP'} workspace: "
            f"{spec['lookup']['name']}"
        )

    ws_faculty = workspaces["Không gian Khoa CNTT"]
    ws_class = workspaces["Lớp K65 CNTT 1"]
    ws_group = workspaces["Nhóm Đồ án Web"]
    ws_kt = workspaces["Không gian Khoa Kinh tế"]
    ws_python = workspaces["Nhóm Ôn thi Python"]

    # ----- Workspace members -----
    member_specs = [
        (ws_faculty.id, users["admin_cntt"].id, "full"),
        (ws_faculty.id, users["gv_tuan"].id, "full"),
        (ws_faculty.id, users["sv_an"].id, "view"),
        (ws_faculty.id, users["sv_binh"].id, "view"),
        (ws_class.id, users["gv_tuan"].id, "full"),
        (ws_class.id, users["sv_an"].id, "view"),
        (ws_class.id, users["sv_binh"].id, "view"),
        (ws_class.id, users["sv_cuong"].id, "view"),
        (ws_group.id, users["sv_an"].id, "full"),
        (ws_group.id, users["sv_binh"].id, "full"),
        (ws_group.id, users["sv_cuong"].id, "edit"),
        (ws_kt.id, users["gv_mai"].id, "full"),
        (ws_kt.id, users["sv_dung"].id, "view"),
        (ws_python.id, users["sv_binh"].id, "full"),
        (ws_python.id, users["sv_an"].id, "edit"),
        (ws_python.id, users["sv_cuong"].id, "view"),
    ]

    for workspace_id, user_id, permission in member_specs:
        member, created = await get_or_create(
            session,
            WorkspaceMember,
            {"workspace_id": workspace_id, "user_id": user_id},
            {"permission_level": permission},
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} member: "
            f"workspace={workspace_id}, user={user_id}"
        )

    # ----- Invitations -----
    invitation_specs = [
        {
            "lookup": {
                "workspace_id": ws_group.id,
                "invited_user_id": users["sv_cuong"].id,
            },
            "values": {
                "invited_by": users["sv_an"].id,
                "status": "pending",
            },
        },
        {
            "lookup": {
                "workspace_id": ws_python.id,
                "invited_user_id": users["sv_dung"].id,
            },
            "values": {
                "invited_by": users["sv_binh"].id,
                "status": "pending",
            },
        },
    ]

    for spec in invitation_specs:
        _, created = await get_or_create(
            session,
            WorkspaceInvitation,
            spec["lookup"],
            spec["values"],
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} invitation: "
            f"workspace={spec['lookup']['workspace_id']}, "
            f"user={spec['lookup']['invited_user_id']}"
        )

    await session.commit()
    return {
        "faculty_cntt": ws_faculty,
        "class_cntt1": ws_class,
        "group_web": ws_group,
        "faculty_kt": ws_kt,
        "group_python": ws_python,
    }


# =========================================================
# 5. SEED CATEGORIES & TAGS
# =========================================================
async def seed_classifications(session: AsyncSession, users):
    print("5. Seeding Categories and Tags...")

    u_admin = users["admin_cntt"]
    u_an = users["sv_an"]
    u_binh = users["sv_binh"]

    # ----- Categories -----
    cat_specs = [
        {
            "lookup": {"owner_id": u_admin.id, "name": "Giáo trình CNTT"},
            "values": {"parent_id": None},
        },
        {
            "lookup": {"owner_id": u_admin.id, "name": "Lập trình"},
            "values": {},
        },
        {
            "lookup": {"owner_id": u_admin.id, "name": "Cơ sở dữ liệu"},
            "values": {},
        },
        {
            "lookup": {"owner_id": u_admin.id, "name": "Mạng máy tính"},
            "values": {},
        },
        {
            "lookup": {"owner_id": u_admin.id, "name": "Kinh tế đại cương"},
            "values": {},
        },
    ]

    categories = {}

    cat_root, created = await get_or_create(
        session,
        Category,
        cat_specs[0]["lookup"],
        cat_specs[0]["values"],
    )
    categories["root"] = cat_root
    print(f"  {'INSERT' if created else 'SKIP'} category: Giáo trình CNTT")

    child_specs = [
        ("Lập trình", {"parent_id": cat_root.id}),
        ("Cơ sở dữ liệu", {"parent_id": cat_root.id}),
        ("Mạng máy tính", {"parent_id": cat_root.id}),
        ("Kinh tế đại cương", {"parent_id": cat_root.id}),
    ]

    for name, values in child_specs:
        cat, created = await get_or_create(
            session,
            Category,
            {"owner_id": u_admin.id, "name": name},
            values,
        )
        categories[name] = cat
        print(f"  {'INSERT' if created else 'SKIP'} category: {name}")

    # ----- Tags -----
    tag_root, created = await get_or_create(
        session,
        Tag,
        {"owner_id": u_admin.id, "name": "Đại cương"},
        {"color": "#000000", "parent_id": None},
    )
    print(f"  {'INSERT' if created else 'SKIP'} tag: Đại cương")

    tags = {"Đại cương": tag_root}

    tag_specs = [
        (
            "Toán cao cấp",
            u_admin.id,
            {"color": "#FF5733", "parent_id": tag_root.id},
        ),
        (
            "Lập trình Python",
            u_admin.id,
            {"color": "#3776AB", "parent_id": None},
        ),
        (
            "Cơ sở dữ liệu",
            u_admin.id,
            {"color": "#2E8B57", "parent_id": None},
        ),
        (
            "Cần ôn tập",
            u_an.id,
            {"color": "#FF0000", "parent_id": None},
        ),
        (
            "Đồ án nhóm",
            u_binh.id,
            {"color": "#8A2BE2", "parent_id": None},
        ),
    ]

    for name, owner_id, values in tag_specs:
        tag, created = await get_or_create(
            session,
            Tag,
            {"owner_id": owner_id, "name": name},
            values,
        )
        tags[name] = tag
        print(f"  {'INSERT' if created else 'SKIP'} tag: {name}")

    await session.commit()

    return {
        "categories": categories,
        "tags": tags,
    }


# =========================================================
# 6. SEED TRASH BATCHES
# =========================================================
async def seed_trash_batches(session: AsyncSession, users, workspaces):
    print("6. Seeding Trash Batches...")

    specs = [
        {
            "lookup": {
                "workspace_id": workspaces["group_web"].id,
                "name": "Nhóm BTL cũ (đã giải tán)",
            },
            "values": {
                "deleted_by": users["sv_an"].id,
                "deleted_at": datetime.now(),
                "purge_at": datetime.now() + timedelta(days=30),
            },
        },
        {
            "lookup": {
                "workspace_id": workspaces["group_python"].id,
                "name": "Tài liệu ôn thi cũ",
            },
            "values": {
                "deleted_by": users["sv_binh"].id,
                "deleted_at": datetime.now(),
                "purge_at": datetime.now() + timedelta(days=30),
            },
        },
    ]

    batches = {}
    for spec in specs:
        batch, created = await get_or_create(
            session,
            TrashBatch,
            spec["lookup"],
            spec["values"],
        )
        batches[spec["lookup"]["name"]] = batch
        print(
            f"  {'INSERT' if created else 'SKIP'} trash batch: "
            f"{spec['lookup']['name']}"
        )

    await session.commit()
    return batches


# =========================================================
# 7. SEED DOCUMENTS & METADATA
# =========================================================
async def seed_documents(
    session: AsyncSession,
    users,
    workspaces,
    classifications,
    trash_batches,
):
    print("7. Seeding Documents, Tags, Versions, Notes...")

    u_an = users["sv_an"]
    u_binh = users["sv_binh"]
    u_tuan = users["gv_tuan"]
    u_mai = users["gv_mai"]

    cat = classifications["categories"]
    tags = classifications["tags"]

    # Dùng checksum làm khóa tự nhiên ổn định cho document seed.
    document_specs = [
        {
            "key": "py",
            "lookup": {"checksum": generate_checksum("py")},
            "values": {
                "owner_id": u_an.id,
                "workspace_id": None,
                "category_id": cat["Lập trình"].id,
                "title": "Ghi chú Python",
                "description": "Tự học Python cơ bản và nâng cao",
                "file_path": "/docs/py.pdf",
                "file_type": "application/pdf",
                "file_size": 1024,
                "is_important": True,
            },
        },
        {
            "key": "web",
            "lookup": {"checksum": generate_checksum("web")},
            "values": {
                "owner_id": u_an.id,
                "workspace_id": workspaces["group_web"].id,
                "category_id": cat["Lập trình"].id,
                "title": "Báo cáo Web",
                "description": "Bản draft đồ án Web của nhóm",
                "file_path": "/docs/web.docx",
                "file_type": "application/msword",
                "file_size": 2048,
                "is_important": True,
            },
        },
        {
            "key": "btl",
            "lookup": {"checksum": generate_checksum("btl")},
            "values": {
                "owner_id": u_tuan.id,
                "workspace_id": workspaces["class_cntt1"].id,
                "category_id": cat["Cơ sở dữ liệu"].id,
                "title": "Bài tập lớn Lập trình",
                "description": "Đề bài và yêu cầu thực hiện bài tập lớn",
                "file_path": "/docs/btl.pdf",
                "file_type": "application/pdf",
                "file_size": 5120,
                "is_important": True,
            },
        },
        {
            "key": "db",
            "lookup": {"checksum": generate_checksum("seed-doc-db")},
            "values": {
                "owner_id": u_an.id,
                "workspace_id": workspaces["group_web"].id,
                "category_id": cat["Cơ sở dữ liệu"].id,
                "title": "Thiết kế cơ sở dữ liệu",
                "description": "ERD, bảng và quan hệ cho hệ thống quản lý tài liệu",
                "file_path": "/docs/database.pdf",
                "file_type": "application/pdf",
                "file_size": 4096,
                "is_important": True,
            },
        },
        {
            "key": "network",
            "lookup": {"checksum": generate_checksum("seed-doc-network")},
            "values": {
                "owner_id": u_mai.id,
                "workspace_id": workspaces["faculty_kt"].id,
                "category_id": cat["Mạng máy tính"].id,
                "title": "Tổng quan mạng máy tính",
                "description": "Tài liệu tham khảo về mạng máy tính cơ bản",
                "file_path": "/docs/network.pdf",
                "file_type": "application/pdf",
                "file_size": 3072,
                "is_important": False,
            },
        },
        {
            "key": "trash",
            "lookup": {"checksum": generate_checksum("trash")},
            "values": {
                "owner_id": u_an.id,
                "workspace_id": workspaces["group_web"].id,
                "category_id": cat["Lập trình"].id,
                "title": "Tài liệu rác",
                "description": "Tài liệu mẫu đã xóa, dùng để kiểm thử thùng rác",
                "file_path": "/docs/trash.pdf",
                "file_type": "application/pdf",
                "file_size": 768,
                "is_important": False,
                "is_deleted": True,
                "deleted_at": datetime.now(),
                "trash_batch_id": trash_batches["Nhóm BTL cũ (đã giải tán)"].id,
            },
        },
    ]

    docs = {}
    for spec in document_specs:
        doc, created = await get_or_create(
            session,
            Document,
            spec["lookup"],
            spec["values"],
        )
        docs[spec["key"]] = doc
        print(
            f"  {'INSERT' if created else 'SKIP'} document: "
            f"{spec['values']['title']}"
        )

    await session.flush()

    # ----- Document <-> Tag -----
    doc_tag_specs = [
        (docs["py"].id, tags["Lập trình Python"].id),
        (docs["py"].id, tags["Cần ôn tập"].id),
        (docs["web"].id, tags["Đồ án nhóm"].id),
        (docs["btl"].id, tags["Đại cương"].id),
        (docs["db"].id, tags["Cơ sở dữ liệu"].id),
        (docs["db"].id, tags["Đồ án nhóm"].id),
        (docs["network"].id, tags["Đại cương"].id),
        (docs["trash"].id, tags["Cần ôn tập"].id),
    ]

    for document_id, tag_id in doc_tag_specs:
        created = await get_or_create_m2m(
            session,
            document_tags,
            {"document_id": document_id, "tag_id": tag_id},
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} document_tag: "
            f"document={document_id}, tag={tag_id}"
        )

    # ----- Document Versions -----
    version_specs = [
        {
            "lookup": {"document_id": docs["web"].id, "version_no": 1},
            "values": {
                "file_path": "/docs/web_v1.docx",
                "checksum": generate_checksum("seed-web-v1"),
                "uploaded_by": u_an.id,
                "note": "Bản thảo đầu tiên",
            },
        },
        {
            "lookup": {"document_id": docs["web"].id, "version_no": 2},
            "values": {
                "file_path": "/docs/web_v2.docx",
                "checksum": generate_checksum("seed-web-v2"),
                "uploaded_by": u_binh.id,
                "note": "Bổ sung phần API và database",
            },
        },
        {
            "lookup": {"document_id": docs["db"].id, "version_no": 1},
            "values": {
                "file_path": "/docs/database_v1.pdf",
                "checksum": generate_checksum("seed-db-v1"),
                "uploaded_by": u_an.id,
                "note": "ERD phiên bản đầu",
            },
        },
    ]

    for spec in version_specs:
        _, created = await get_or_create(
            session,
            DocumentVersion,
            spec["lookup"],
            spec["values"],
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} document_version: "
            f"document={spec['lookup']['document_id']}, "
            f"version={spec['lookup']['version_no']}"
        )

    # ----- Notes -----
    note_specs = [
        {
            "lookup": {
                "document_id": docs["btl"].id,
                "user_id": u_an.id,
                "note": "Cần nộp trước thứ 6",
            },
            "values": {},
        },
        {
            "lookup": {
                "document_id": docs["web"].id,
                "user_id": u_binh.id,
                "note": "Kiểm tra lại API đăng nhập",
            },
            "values": {},
        },
        {
            "lookup": {
                "document_id": docs["db"].id,
                "user_id": u_an.id,
                "note": "Bổ sung index cho các cột tìm kiếm thường xuyên",
            },
            "values": {},
        },
    ]

    for spec in note_specs:
        _, created = await get_or_create(
            session,
            Note,
            spec["lookup"],
            spec["values"],
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} note: "
            f"document={spec['lookup']['document_id']}, "
            f"user={spec['lookup']['user_id']}"
        )

    await session.commit()
    return docs


# =========================================================
# 8. SEED SHARES, NOTIFICATIONS, FAVORITES, LOGS, JOBS
# =========================================================
async def seed_interactions(session: AsyncSession, users, workspaces, docs):
    print("8. Seeding Shares, Notifications, Favorites, Logs, and Jobs...")

    u_an = users["sv_an"]
    u_binh = users["sv_binh"]
    u_cuong = users["sv_cuong"]
    u_dung = users["sv_dung"]

    # ----- Shares -----
    share_specs = [
        {
            "lookup": {
                "document_id": docs["py"].id,
                "source_document_id": docs["py"].id,
                "from_user_id": u_an.id,
                "to_user_id": u_cuong.id,
            },
            "values": {"share_type": "personal_send"},
        },
        {
            "lookup": {
                "document_id": docs["web"].id,
                "source_document_id": docs["web"].id,
                "from_user_id": u_an.id,
                "to_user_id": u_binh.id,
            },
            "values": {"share_type": "personal_send"},
        },
        {
            "lookup": {
                "document_id": docs["db"].id,
                "source_document_id": docs["db"].id,
                "from_user_id": u_an.id,
                "to_user_id": u_dung.id,
            },
            "values": {"share_type": "personal_send"},
        },
    ]

    for spec in share_specs:
        _, created = await get_or_create(
            session,
            DocumentShare,
            spec["lookup"],
            spec["values"],
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} share: "
            f"document={spec['lookup']['document_id']}, "
            f"to_user={spec['lookup']['to_user_id']}"
        )

    # ----- Notifications -----
    notification_specs = [
        {
            "lookup": {
                "user_id": u_cuong.id,
                "type": "invite",
                "workspace_id": workspaces["group_web"].id,
                "message": "An đã mời bạn vào Nhóm Đồ án Web",
            },
            "values": {},
        },
        {
            "lookup": {
                "user_id": u_binh.id,
                "type": "new_document",
                "workspace_id": workspaces["class_cntt1"].id,
                "document_id": docs["btl"].id,
                "message": "Thầy Tuấn đã tải lên Bài tập lớn Lập trình",
            },
            "values": {},
        },
        {
            "lookup": {
                "user_id": u_dung.id,
                "type": "share",
                "workspace_id": None,
                "document_id": docs["db"].id,
                "message": "An đã chia sẻ tài liệu Thiết kế cơ sở dữ liệu",
            },
            "values": {},
        },
    ]

    for spec in notification_specs:
        _, created = await get_or_create(
            session,
            Notification,
            spec["lookup"],
            spec["values"],
        )
        print(f"  {'INSERT' if created else 'SKIP'} notification")

    # ----- Favorites -----
    favorite_specs = [
        (u_an.id, docs["btl"].id),
        (u_binh.id, docs["btl"].id),
        (u_an.id, docs["web"].id),
        (u_cuong.id, docs["py"].id),
    ]

    for user_id, document_id in favorite_specs:
        _, created = await get_or_create(
            session,
            Favorite,
            {"user_id": user_id, "document_id": document_id},
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} favorite: "
            f"user={user_id}, document={document_id}"
        )

    # ----- Download logs -----
    log_specs = [
        {
            "lookup": {
                "document_id": docs["btl"].id,
                "user_id": u_an.id,
                "action": "view",
            },
            "values": {},
        },
        {
            "lookup": {
                "document_id": docs["btl"].id,
                "user_id": u_binh.id,
                "action": "download",
            },
            "values": {},
        },
        {
            "lookup": {
                "document_id": docs["web"].id,
                "user_id": u_cuong.id,
                "action": "view",
            },
            "values": {},
        },
    ]

    for spec in log_specs:
        _, created = await get_or_create(
            session,
            DownloadLog,
            spec["lookup"],
            spec["values"],
        )
        print(f"  {'INSERT' if created else 'SKIP'} download_log")

    # ----- Processing jobs -----
    job_specs = [
        {
            "lookup": {
                "document_id": docs["py"].id,
                "job_type": "virus_scan",
            },
            "values": {
                "status": "done",
                "result": {"safe": True},
            },
        },
        {
            "lookup": {
                "document_id": docs["web"].id,
                "job_type": "virus_scan",
            },
            "values": {
                "status": "done",
                "result": {"safe": True},
            },
        },
        {
            "lookup": {
                "document_id": docs["db"].id,
                "job_type": "thumbnail",
            },
            "values": {
                "status": "done",
                "result": {"generated": True, "pages": 12},
            },
        },
    ]

    for spec in job_specs:
        _, created = await get_or_create(
            session,
            ProcessingJob,
            spec["lookup"],
            spec["values"],
        )
        print(
            f"  {'INSERT' if created else 'SKIP'} processing_job: "
            f"document={spec['lookup']['document_id']}, "
            f"type={spec['lookup']['job_type']}"
        )

    await session.commit()


# =========================================================
# MAIN
# =========================================================
async def seed_database():
    print("=" * 70)
    print("STARTING INCREMENTAL DATABASE SEEDING (PHASE 2 - ITEMS 4 TO 8)")
    print("=" * 70)

    async with AsyncSessionLocal() as session:
        try:
            # Không gọi:
            # 1. clear_data()
            # 2. seed_academics()
            # 3. seed_users()
            #
            # Ba nhóm dữ liệu trên được coi là dữ liệu nền đã tồn tại.
            faculties, classes, users = await load_base_data(session)

            workspaces = await seed_workspaces_and_members(
                session,
                users,
                faculties,
                classes,
            )

            classifications = await seed_classifications(session, users)

            trash_batches = await seed_trash_batches(
                session,
                users,
                workspaces,
            )

            docs = await seed_documents(
                session,
                users,
                workspaces,
                classifications,
                trash_batches,
            )

            await seed_interactions(
                session,
                users,
                workspaces,
                docs,
            )

            print("=" * 70)
            print("DATABASE SEEDED SUCCESSFULLY (INCREMENTAL / IDEMPOTENT)!")
            print("=" * 70)

        except Exception as error:
            await session.rollback()
            print("=" * 70)
            print("SEEDING FAILED - ROLLED BACK")
            print(error)
            print("=" * 70)
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
