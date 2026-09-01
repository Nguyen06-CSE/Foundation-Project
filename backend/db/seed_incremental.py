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
from app.models.folder import Folder
from app.models.folder_tag import FolderTag
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
# 5a. SEED CATEGORIES & TAGS
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
# 5b. SEED FOLDERS & FOLDER_TAGS
# =========================================================
async def seed_folders(session: AsyncSession, users, classifications):
    print("5b. Seeding Folders and FolderTags...")

    u_admin = users["admin_cntt"]
    u_an = users["sv_an"]
    u_tuan = users["gv_tuan"]
    u_mai = users["gv_mai"]

    tags = classifications["tags"]

    # Specs cho các Folder
    folder_specs = [
        {
            "key": "giao_trinh",
            "lookup": {"owner_id": u_admin.id, "name": "Giáo trình"},
            "values": {"color": "#3B82F6"},
            "tag_keys": ["Đại cương", "Lập trình Python", "Cơ sở dữ liệu"],
        },
        {
            "key": "bai_tap",
            "lookup": {"owner_id": u_tuan.id, "name": "Bài Tập"},
            "values": {"color": "#10B981"},
            "tag_keys": ["Toán cao cấp"],
        },
        {
            "key": "tai_lieu",
            "lookup": {"owner_id": u_mai.id, "name": "Tài liệu tham khảo"},
            "values": {"color": "#F59E0B"},
            "tag_keys": [],
        },
        {
            "key": "do_an",
            "lookup": {"owner_id": u_an.id, "name": "Đồ án tốt nghiệp"},
            "values": {"color": "#EC4899"},
            "tag_keys": ["Đồ án nhóm"],
        },
        {
            "key": "hoc_tap_an",
            "lookup": {"owner_id": u_an.id, "name": "Góc Học Tập Cá Nhân"},
            "values": {"color": "#8B5CF6"},
            "tag_keys": ["Lập trình Python", "Cần ôn tập"],
        },
    ]

    folders = {}
    for spec in folder_specs:
        # 1. Seed bảng folders
        folder, created = await get_or_create(
            session,
            Folder,
            spec["lookup"],
            spec["values"],
        )
        folders[spec["key"]] = folder
        print(f"  {'INSERT' if created else 'SKIP'} folder: {spec['lookup']['name']}")

        # 2. Seed bảng trung gian folder_tags
        for tag_key in spec["tag_keys"]:
            if tag_key in tags:
                tag_id = tags[tag_key].id
                ft_obj, ft_created = await get_or_create(
                    session,
                    FolderTag,
                    {"folder_id": folder.id, "tag_id": tag_id},
                )
                print(
                    f"    {'INSERT' if ft_created else 'SKIP'} folder_tag: "
                    f"folder={folder.name}, tag={tag_key}"
                )

    await session.commit()
    return folders



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
# 9. SEED ADDITIONAL DATA (TAGS, FOLDERS, DOCUMENTS) FOR MULTIPLE USERS
# =========================================================
async def seed_additional_data(
    session: AsyncSession,
    users,
    workspaces,
    classifications,
    trash_batches,
):
    print("9. Seeding additional Tags, Folders, and Documents...")

    # ----- Additional Tags -----
    # Mỗi user được thêm 2-3 tag mới
    tag_specs = [
        # admin_cntt
        {"name": "Hướng dẫn", "owner_id": users["admin_cntt"].id, "color": "#FFA500"},
        {"name": "Thực hành", "owner_id": users["admin_cntt"].id, "color": "#008000"},
        {"name": "Đề thi", "owner_id": users["admin_cntt"].id, "color": "#FF0000"},
        # gv_tuan
        {"name": "Giáo án", "owner_id": users["gv_tuan"].id, "color": "#1E90FF"},
        {"name": "Bài giảng", "owner_id": users["gv_tuan"].id, "color": "#FF4500"},
        {"name": "Bài tập nâng cao", "owner_id": users["gv_tuan"].id, "color": "#8B008B"},
        # gv_mai
        {"name": "Kinh tế vi mô", "owner_id": users["gv_mai"].id, "color": "#2E8B57"},
        {"name": "Kinh tế vĩ mô", "owner_id": users["gv_mai"].id, "color": "#4682B4"},
        {"name": "Thương mại", "owner_id": users["gv_mai"].id, "color": "#D2691E"},
        # sv_an
        {"name": "Web Development", "owner_id": users["sv_an"].id, "color": "#6A5ACD"},
        {"name": "JavaScript", "owner_id": users["sv_an"].id, "color": "#F7DF1E"},
        # sv_binh
        {"name": "Machine Learning", "owner_id": users["sv_binh"].id, "color": "#FF6F00"},
        {"name": "Data Visualization", "owner_id": users["sv_binh"].id, "color": "#17BECF"},
        # sv_cuong
        {"name": "Java", "owner_id": users["sv_cuong"].id, "color": "#007396"},
        {"name": "Spring Boot", "owner_id": users["sv_cuong"].id, "color": "#6DB33F"},
        # sv_dung
        {"name": "Tài chính", "owner_id": users["sv_dung"].id, "color": "#B22222"},
        {"name": "Ngân hàng", "owner_id": users["sv_dung"].id, "color": "#8FBC8F"},
    ]

    new_tags = {}
    for spec in tag_specs:
        lookup = {"owner_id": spec["owner_id"], "name": spec["name"]}
        values = {"color": spec["color"], "parent_id": None}
        tag, created = await get_or_create(session, Tag, lookup, values)
        new_tags[(spec["owner_id"], spec["name"])] = tag
        print(f"  {'INSERT' if created else 'SKIP'} tag: {spec['name']} (user {spec['owner_id']})")

    # ----- Additional Folders -----
    # Mỗi user có 1 folder mới, gán tag vừa tạo
    folder_specs = [
        {
            "owner_id": users["admin_cntt"].id,
            "name": "Tài liệu hành chính",
            "color": "#A9A9A9",
            "tag_names": ["Hướng dẫn", "Đề thi"],
        },
        {
            "owner_id": users["gv_tuan"].id,
            "name": "Giáo trình môn học",
            "color": "#FFD700",
            "tag_names": ["Giáo án", "Bài giảng"],
        },
        {
            "owner_id": users["gv_mai"].id,
            "name": "Kinh tế học",
            "color": "#8FBC8F",
            "tag_names": ["Kinh tế vi mô", "Kinh tế vĩ mô"],
        },
        {
            "owner_id": users["sv_an"].id,
            "name": "Frontend",
            "color": "#E9967A",
            "tag_names": ["Web Development", "JavaScript"],
        },
        {
            "owner_id": users["sv_binh"].id,
            "name": "AI Projects",
            "color": "#9370DB",
            "tag_names": ["Machine Learning", "Data Visualization"],
        },
        {
            "owner_id": users["sv_cuong"].id,
            "name": "Backend",
            "color": "#20B2AA",
            "tag_names": ["Java", "Spring Boot"],
        },
        {
            "owner_id": users["sv_dung"].id,
            "name": "Tài chính ngân hàng",
            "color": "#DAA520",
            "tag_names": ["Tài chính", "Ngân hàng"],
        },
    ]

    new_folders = {}
    for spec in folder_specs:
        lookup = {"owner_id": spec["owner_id"], "name": spec["name"]}
        values = {"color": spec["color"]}
        folder, created = await get_or_create(session, Folder, lookup, values)
        new_folders[(spec["owner_id"], spec["name"])] = folder
        print(f"  {'INSERT' if created else 'SKIP'} folder: {spec['name']} (user {spec['owner_id']})")

        # Gán tag cho folder
        for tag_name in spec["tag_names"]:
            key = (spec["owner_id"], tag_name)
            if key in new_tags:
                tag_id = new_tags[key].id
                ft_obj, ft_created = await get_or_create(
                    session,
                    FolderTag,
                    {"folder_id": folder.id, "tag_id": tag_id},
                )
                print(f"    {'INSERT' if ft_created else 'SKIP'} folder_tag: {folder.name} <-> {tag_name}")

    # ----- Additional Documents -----
    # Mỗi user có 2-3 document mới, gán tag vừa tạo, kèm version, note, share, favorite...
    doc_specs = [
        # admin_cntt
        {
            "key": "admin_doc1",
            "title": "Quy trình xử lý văn bản",
            "owner_id": users["admin_cntt"].id,
            "workspace_id": workspaces["faculty_cntt"].id,
            "category_id": classifications["categories"]["root"].id,
            "description": "Hướng dẫn quy trình hành chính",
            "file_path": "/docs/admin_proc.pdf",
            "file_type": "application/pdf",
            "file_size": 2048,
            "is_important": True,
            "tag_names": ["Hướng dẫn", "Đề thi"],
            "versions": [{"version_no": 1, "note": "Bản chính thức", "uploaded_by": users["admin_cntt"].id}],
            "notes": [{"user_id": users["gv_tuan"].id, "note": "Cần cập nhật quy trình mới"}],
            "share_to": [users["gv_tuan"].id, users["sv_an"].id],
        },
        {
            "key": "admin_doc2",
            "title": "Đề cương môn học CNTT",
            "owner_id": users["admin_cntt"].id,
            "workspace_id": workspaces["faculty_cntt"].id,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Đề cương chi tiết các môn",
            "file_path": "/docs/de_cuong.pdf",
            "file_type": "application/pdf",
            "file_size": 4096,
            "is_important": False,
            "tag_names": ["Thực hành", "Đề thi"],
            "versions": [],
            "notes": [],
            "share_to": [],
        },
        # gv_tuan
        {
            "key": "tuan_doc1",
            "title": "Giáo án lập trình C",
            "owner_id": users["gv_tuan"].id,
            "workspace_id": workspaces["class_cntt1"].id,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Giáo án chi tiết môn C",
            "file_path": "/docs/c_lesson.pdf",
            "file_type": "application/pdf",
            "file_size": 1024,
            "is_important": True,
            "tag_names": ["Giáo án", "Bài giảng"],
            "versions": [{"version_no": 1, "note": "Bản thảo"}],
            "notes": [{"user_id": users["sv_an"].id, "note": "Chương 3 cần sửa"}],
            "share_to": [users["sv_an"].id, users["sv_binh"].id],
        },
        {
            "key": "tuan_doc2",
            "title": "Bài tập nâng cao - Đệ quy",
            "owner_id": users["gv_tuan"].id,
            "workspace_id": workspaces["class_cntt1"].id,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Bài tập đệ quy khó",
            "file_path": "/docs/recursion.pdf",
            "file_type": "application/pdf",
            "file_size": 512,
            "is_important": False,
            "tag_names": ["Bài tập nâng cao"],
            "versions": [],
            "notes": [],
            "share_to": [],
        },
        # gv_mai
        {
            "key": "mai_doc1",
            "title": "Lý thuyết kinh tế vi mô",
            "owner_id": users["gv_mai"].id,
            "workspace_id": workspaces["faculty_kt"].id,
            "category_id": classifications["categories"]["Kinh tế đại cương"].id,
            "description": "Tổng quan vi mô",
            "file_path": "/docs/micro.pdf",
            "file_type": "application/pdf",
            "file_size": 3072,
            "is_important": True,
            "tag_names": ["Kinh tế vi mô"],
            "versions": [{"version_no": 1, "note": "Lần đầu"}],
            "notes": [{"user_id": users["sv_dung"].id, "note": "Cần thêm đồ thị"}],
            "share_to": [users["sv_dung"].id],
        },
        {
            "key": "mai_doc2",
            "title": "Thương mại quốc tế",
            "owner_id": users["gv_mai"].id,
            "workspace_id": workspaces["faculty_kt"].id,
            "category_id": classifications["categories"]["Kinh tế đại cương"].id,
            "description": "Các hiệp định thương mại",
            "file_path": "/docs/trade.pdf",
            "file_type": "application/pdf",
            "file_size": 2048,
            "is_important": False,
            "tag_names": ["Thương mại"],
            "versions": [],
            "notes": [],
            "share_to": [],
        },
        # sv_an
        {
            "key": "an_doc1",
            "title": "React JS cơ bản",
            "owner_id": users["sv_an"].id,
            "workspace_id": workspaces["group_web"].id,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Giới thiệu React",
            "file_path": "/docs/react.pdf",
            "file_type": "application/pdf",
            "file_size": 1536,
            "is_important": True,
            "tag_names": ["Web Development", "JavaScript"],
            "versions": [{"version_no": 1, "note": "Draft"}, {"version_no": 2, "note": "Thêm hooks"}],
            "notes": [{"user_id": users["sv_binh"].id, "note": "Cần viết thêm về state"}],
            "share_to": [users["sv_binh"].id, users["sv_cuong"].id],
        },
        {
            "key": "an_doc2",
            "title": "Node.js REST API",
            "owner_id": users["sv_an"].id,
            "workspace_id": workspaces["group_web"].id,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Xây dựng API với Express",
            "file_path": "/docs/node_api.pdf",
            "file_type": "application/pdf",
            "file_size": 1024,
            "is_important": False,
            "tag_names": ["Web Development"],
            "versions": [],
            "notes": [],
            "share_to": [],
        },
        # sv_binh
        {
            "key": "binh_doc1",
            "title": "Giới thiệu Machine Learning",
            "owner_id": users["sv_binh"].id,
            "workspace_id": workspaces["group_python"].id,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Các khái niệm cơ bản ML",
            "file_path": "/docs/ml_intro.pdf",
            "file_type": "application/pdf",
            "file_size": 2048,
            "is_important": True,
            "tag_names": ["Machine Learning"],
            "versions": [{"version_no": 1, "note": "Sơ bộ"}],
            "notes": [{"user_id": users["sv_an"].id, "note": "Thêm ví dụ về regression"}],
            "share_to": [users["sv_an"].id],
        },
        {
            "key": "binh_doc2",
            "title": "Data Visualization with Matplotlib",
            "owner_id": users["sv_binh"].id,
            "workspace_id": workspaces["group_python"].id,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Hướng dẫn vẽ biểu đồ",
            "file_path": "/docs/matplotlib.pdf",
            "file_type": "application/pdf",
            "file_size": 1024,
            "is_important": False,
            "tag_names": ["Data Visualization"],
            "versions": [],
            "notes": [],
            "share_to": [],
        },
        # sv_cuong
        {
            "key": "cuong_doc1",
            "title": "Java Collections Framework",
            "owner_id": users["sv_cuong"].id,
            "workspace_id": None,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Tổng quan các Collections",
            "file_path": "/docs/java_collections.pdf",
            "file_type": "application/pdf",
            "file_size": 1024,
            "is_important": True,
            "tag_names": ["Java"],
            "versions": [{"version_no": 1, "note": "Lần đầu"}],
            "notes": [{"user_id": users["sv_an"].id, "note": "Thêm ví dụ về Concurrent"}],
            "share_to": [users["sv_an"].id],
        },
        {
            "key": "cuong_doc2",
            "title": "Spring Boot Microservices",
            "owner_id": users["sv_cuong"].id,
            "workspace_id": None,
            "category_id": classifications["categories"]["Lập trình"].id,
            "description": "Xây dựng microservices với Spring Boot",
            "file_path": "/docs/spring_micro.pdf",
            "file_type": "application/pdf",
            "file_size": 2048,
            "is_important": False,
            "tag_names": ["Spring Boot"],
            "versions": [],
            "notes": [],
            "share_to": [],
        },
        # sv_dung
        {
            "key": "dung_doc1",
            "title": "Phân tích tài chính doanh nghiệp",
            "owner_id": users["sv_dung"].id,
            "workspace_id": None,
            "category_id": classifications["categories"]["Kinh tế đại cương"].id,
            "description": "Các chỉ số tài chính",
            "file_path": "/docs/fin_analysis.pdf",
            "file_type": "application/pdf",
            "file_size": 2048,
            "is_important": True,
            "tag_names": ["Tài chính"],
            "versions": [{"version_no": 1, "note": "Bản nháp"}],
            "notes": [{"user_id": users["gv_mai"].id, "note": "Cần bổ sung phân tích rủi ro"}],
            "share_to": [users["gv_mai"].id],
        },
        {
            "key": "dung_doc2",
            "title": "Ngân hàng trung ương",
            "owner_id": users["sv_dung"].id,
            "workspace_id": None,
            "category_id": classifications["categories"]["Kinh tế đại cương"].id,
            "description": "Vai trò và chính sách",
            "file_path": "/docs/central_bank.pdf",
            "file_type": "application/pdf",
            "file_size": 1536,
            "is_important": False,
            "tag_names": ["Ngân hàng"],
            "versions": [],
            "notes": [],
            "share_to": [],
        },
    ]

    new_docs = {}
    for spec in doc_specs:
        checksum = generate_checksum(spec["key"])  # key dùng để tạo checksum ổn định
        lookup = {"checksum": checksum}
        values = {
            "owner_id": spec["owner_id"],
            "workspace_id": spec.get("workspace_id"),
            "category_id": spec["category_id"],
            "title": spec["title"],
            "description": spec["description"],
            "file_path": spec["file_path"],
            "file_type": spec["file_type"],
            "file_size": spec["file_size"],
            "is_important": spec["is_important"],
            "is_deleted": False,
            "deleted_at": None,
            "trash_batch_id": None,
        }
        doc, created = await get_or_create(session, Document, lookup, values)
        new_docs[spec["key"]] = doc
        print(f"  {'INSERT' if created else 'SKIP'} document: {spec['title']} (user {spec['owner_id']})")

        # Gán tag cho document
        for tag_name in spec["tag_names"]:
            key = (spec["owner_id"], tag_name)
            if key in new_tags:
                tag_id = new_tags[key].id
                dt_created = await get_or_create_m2m(
                    session,
                    document_tags,
                    {"document_id": doc.id, "tag_id": tag_id},
                )
                print(f"    {'INSERT' if dt_created else 'SKIP'} document_tag: {doc.title} <-> {tag_name}")

        # Thêm version
        for v_spec in spec.get("versions", []):
            v_lookup = {"document_id": doc.id, "version_no": v_spec["version_no"]}
            v_values = {
                "file_path": f"/docs/versions/{spec['key']}_v{v_spec['version_no']}.pdf",
                "checksum": generate_checksum(f"{spec['key']}_v{v_spec['version_no']}"),
                "uploaded_by": v_spec.get("uploaded_by", spec["owner_id"]),
                "note": v_spec.get("note", ""),
            }
            _, v_created = await get_or_create(session, DocumentVersion, v_lookup, v_values)
            print(f"    {'INSERT' if v_created else 'SKIP'} version v{v_spec['version_no']} for {spec['title']}")

        # Thêm note
        for n_spec in spec.get("notes", []):
            n_lookup = {
                "document_id": doc.id,
                "user_id": n_spec["user_id"],
                "note": n_spec["note"],
            }
            _, n_created = await get_or_create(session, Note, n_lookup, {})
            print(f"    {'INSERT' if n_created else 'SKIP'} note for {spec['title']} by user {n_spec['user_id']}")

        # Thêm share
        for to_user_id in spec.get("share_to", []):
            s_lookup = {
                "document_id": doc.id,
                "source_document_id": doc.id,
                "from_user_id": spec["owner_id"],
                "to_user_id": to_user_id,
            }
            s_values = {"share_type": "personal_send"}
            _, s_created = await get_or_create(session, DocumentShare, s_lookup, s_values)
            print(f"    {'INSERT' if s_created else 'SKIP'} share to user {to_user_id} for {spec['title']}")

        # Thêm favorite cho owner (tự động)
        fav_lookup = {"user_id": spec["owner_id"], "document_id": doc.id}
        _, fav_created = await get_or_create(session, Favorite, fav_lookup, {})
        print(f"    {'INSERT' if fav_created else 'SKIP'} favorite for owner {spec['owner_id']}")

    await session.commit()
    print("9. Additional seeding completed.")

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

            folders = await seed_folders(session, users, classifications)

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

            await seed_additional_data(session, users, workspaces, classifications, trash_batches)

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
