import asyncio
import hashlib
import sys
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select, insert, text
from sqlalchemy.ext.asyncio import AsyncSession

# Thiết lập đường dẫn để import được module app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import AsyncSessionLocal

# Import các models
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
from app.models.document_tag import document_tags  # Table trung gian (Many-to-Many)
from app.models.note import Note
from app.models.trash_batch import TrashBatch
from app.models.document_share import DocumentShare
from app.models.notification import Notification
from app.models.favorite import Favorite  # <--- Sửa lỗi import ở đây
from app.models.download_log import DownloadLog
from app.models.processing_job import ProcessingJob


# =========================================================
# HELPER FUNCTIONS
# =========================================================
def generate_checksum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

# =========================================================
# 1. CLEAR OLD DATA
# =========================================================
async def clear_data(session: AsyncSession):
    print("Clearing old data...")
    # Danh sách các bảng cần xóa dữ liệu (TRUNCATE CASCADE giúp xóa sạch dữ liệu và reset lại ID)
    tables = [
        "processing_jobs", "download_logs", "favorites", "notes", 
        "document_versions", "document_tags", "documents", "trash_batches",
        "workspace_invitations", "workspace_members", "workspaces", 
        "tags", "categories", "users", "classes", "faculties", "document_shares", "notifications"
    ]
    tables_str = ", ".join(tables)
    # Cần dùng text() từ sqlalchemy
    await session.execute(text(f"TRUNCATE TABLE {tables_str} RESTART IDENTITY CASCADE;"))
    await session.commit()
    print("Old data cleared successfully.")


# =========================================================
# 2. SEED FACULTIES & CLASSES
# =========================================================
async def seed_academics(session: AsyncSession):
    print("1. Seeding Faculties and Classes...")
    
    faculties = [
        Faculty(code="CNTT", name="Khoa Công nghệ Thông tin"),
        Faculty(code="KT", name="Khoa Kinh tế"),
        Faculty(code="NN", name="Khoa Ngoại ngữ")
    ]
    session.add_all(faculties)
    await session.commit()
    for f in faculties: await session.refresh(f)

    classes = [
        Class(faculty_id=faculties[0].id, code="K65-CNTT1", name="Lớp K65 CNTT 1"),
        Class(faculty_id=faculties[0].id, code="K65-CNTT2", name="Lớp K65 CNTT 2"),
        Class(faculty_id=faculties[1].id, code="K65-KT1", name="Lớp K65 Kinh tế 1"),
    ]
    session.add_all(classes)
    await session.commit()
    for c in classes: await session.refresh(c)

    return faculties, classes

# =========================================================
# 3. SEED USERS
# =========================================================
async def seed_users(session: AsyncSession, faculties, classes):
    print("2. Seeding Users (Admins, Teachers, Students)...")
    f_cntt, f_kt, _ = faculties
    c_cntt1, c_cntt2, c_kt1 = classes

    users_data = [
        {"username": "sysadmin", "email": "sysadmin@school.edu.vn", "password_hash": "hash123", "full_name": "System Admin", "role": "system_admin"},
        {"username": "schooladmin", "email": "admin@school.edu.vn", "password_hash": "hash123", "full_name": "School Admin", "role": "school_admin"},
        {"username": "admin_cntt", "email": "cntt@school.edu.vn", "password_hash": "hash123", "full_name": "Quản trị Khoa CNTT", "role": "faculty_admin", "faculty_id": f_cntt.id},
        {"username": "gv_tuan", "email": "tuan.gv@school.edu.vn", "password_hash": "hash123", "full_name": "GV. Nguyễn Anh Tuấn", "role": "teacher", "faculty_id": f_cntt.id},
        {"username": "gv_mai", "email": "mai.gv@school.edu.vn", "password_hash": "hash123", "full_name": "GV. Trần Thị Mai", "role": "teacher", "faculty_id": f_kt.id},
        {"username": "sv_an", "email": "an.sv@student.edu.vn", "password_hash": "hash123", "full_name": "Nguyễn Văn An", "role": "student", "student_code": "SV001", "faculty_id": f_cntt.id, "class_id": c_cntt1.id},
        {"username": "sv_binh", "email": "binh.sv@student.edu.vn", "password_hash": "hash123", "full_name": "Trần Thanh Bình", "role": "student", "student_code": "SV002", "faculty_id": f_cntt.id, "class_id": c_cntt1.id},
        {"username": "sv_cuong", "email": "cuong.sv@student.edu.vn", "password_hash": "hash123", "full_name": "Lê Hùng Cường", "role": "student", "student_code": "SV003", "faculty_id": f_cntt.id, "class_id": c_cntt2.id},
        {"username": "sv_dung", "email": "dung.sv@student.edu.vn", "password_hash": "hash123", "full_name": "Phạm Mỹ Dung", "role": "student", "student_code": "SV004", "faculty_id": f_kt.id, "class_id": c_kt1.id},
    ]

    users = {}
    for data in users_data:
        user = User(**data)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        users[user.username] = user

    return users

# =========================================================
# 4. SEED WORKSPACES, MEMBERS, INVITATIONS
# =========================================================
async def seed_workspaces_and_members(session: AsyncSession, users, faculties, classes):
    print("3. Seeding Workspaces, Members, and Invitations...")
    f_cntt = faculties[0]
    c_cntt1 = classes[0]

    ws_faculty = Workspace(type="faculty", name="Không gian Khoa CNTT", description="Tài liệu chung", owner_id=users["admin_cntt"].id, ref_faculty_id=f_cntt.id, default_member_permission="view")
    ws_class = Workspace(type="class", name="Lớp K65 CNTT 1", description="Học tập lớp CNTT 1", owner_id=users["gv_tuan"].id, ref_class_id=c_cntt1.id, default_member_permission="view")
    ws_group = Workspace(type="group", name="Nhóm Đồ án Web", description="Làm đồ án", owner_id=users["sv_an"].id, default_member_permission="full")
    
    session.add_all([ws_faculty, ws_class, ws_group])
    await session.commit()
    for ws in [ws_faculty, ws_class, ws_group]: await session.refresh(ws)

    members = [
        WorkspaceMember(workspace_id=ws_faculty.id, user_id=users["admin_cntt"].id, permission_level="full"),
        WorkspaceMember(workspace_id=ws_faculty.id, user_id=users["gv_tuan"].id, permission_level="full"),
        WorkspaceMember(workspace_id=ws_faculty.id, user_id=users["sv_an"].id, permission_level="view"),
        WorkspaceMember(workspace_id=ws_class.id, user_id=users["gv_tuan"].id, permission_level="full"),
        WorkspaceMember(workspace_id=ws_class.id, user_id=users["sv_an"].id, permission_level="view"),
        WorkspaceMember(workspace_id=ws_class.id, user_id=users["sv_binh"].id, permission_level="view"),
        WorkspaceMember(workspace_id=ws_group.id, user_id=users["sv_an"].id, permission_level="full"),
        WorkspaceMember(workspace_id=ws_group.id, user_id=users["sv_binh"].id, permission_level="full"),
    ]
    session.add_all(members)
    
    invitations = [
        WorkspaceInvitation(workspace_id=ws_group.id, invited_user_id=users["sv_cuong"].id, invited_by=users["sv_an"].id, status="pending"),
    ]
    session.add_all(invitations)
    await session.commit()
    
    return {"faculty": ws_faculty, "class": ws_class, "group": ws_group}

# =========================================================
# 5. SEED CATEGORIES & TAGS
# =========================================================
async def seed_classifications(session: AsyncSession, users):
    print("4. Seeding Categories and Tags...")
    u_admin = users["admin_cntt"]
    u_an = users["sv_an"]

    cat_root = Category(owner_id=u_admin.id, name="Giáo trình CNTT", parent_id=None)
    session.add(cat_root)
    await session.commit()
    await session.refresh(cat_root)

    cat_sub1 = Category(owner_id=u_admin.id, name="Lập trình", parent_id=cat_root.id)
    session.add(cat_sub1)

    tag_root = Tag(owner_id=u_admin.id, name="Đại cương", color="#000000")
    session.add(tag_root)
    await session.commit()
    await session.refresh(tag_root)
    
    tag_sub = Tag(owner_id=u_admin.id, name="Toán cao cấp", color="#FF5733", parent_id=tag_root.id)
    tag_personal = Tag(owner_id=u_an.id, name="Cần ôn tập", color="#FF0000")
    session.add_all([tag_sub, tag_personal])
    await session.commit()
    
    return {"cat_sub1": cat_sub1, "tag_sub": tag_sub, "tag_personal": tag_personal}

# =========================================================
# 6. SEED TRASH BATCHES
# =========================================================
async def seed_trash_batches(session: AsyncSession, users, workspaces):
    print("5. Seeding Trash Batches...")
    batch = TrashBatch(
        workspace_id=workspaces["group"].id,
        name="Nhóm BTL cũ (đã giải tán)",
        deleted_by=users["sv_an"].id,
        deleted_at=datetime.now(),
        purge_at=datetime.now() + timedelta(days=30)
    )
    session.add(batch)
    await session.commit()
    await session.refresh(batch)
    return batch

# =========================================================
# 7. SEED DOCUMENTS & METADATA
# =========================================================
async def seed_documents(session: AsyncSession, users, workspaces, classifications, trash_batch):
    print("6. Seeding Documents, Tags, Versions, Notes...")
    u_an = users["sv_an"]
    u_tuan = users["gv_tuan"]

    docs = [
        Document(owner_id=u_an.id, workspace_id=None, category_id=classifications["cat_sub1"].id, title="Ghi chú Python", description="Tự học", file_path="/docs/py.pdf", file_type="application/pdf", file_size=1024, checksum=generate_checksum("py"), is_important=True),
        Document(owner_id=u_an.id, workspace_id=workspaces["group"].id, title="Báo cáo Web", description="Bản draft", file_path="/docs/web.docx", file_type="application/msword", file_size=2048, checksum=generate_checksum("web")),
        Document(owner_id=u_tuan.id, workspace_id=workspaces["class"].id, title="Bài tập lớn Lập trình", description="Đề bài", file_path="/docs/btl.pdf", file_type="application/pdf", file_size=5120, checksum=generate_checksum("btl")),
        Document(owner_id=u_an.id, workspace_id=workspaces["group"].id, title="Tài liệu rác", file_path="/docs/trash.pdf", checksum=generate_checksum("trash"), is_deleted=True, deleted_at=datetime.now(), trash_batch_id=trash_batch.id)
    ]
    session.add_all(docs)
    await session.commit()
    for d in docs: await session.refresh(d)

    await session.execute(insert(document_tags).values([
        {"document_id": docs[0].id, "tag_id": classifications["tag_personal"].id},
        {"document_id": docs[2].id, "tag_id": classifications["tag_sub"].id},
    ]))
    
    session.add(DocumentVersion(document_id=docs[1].id, version_no=1, file_path="/docs/web_v1.docx", checksum=generate_checksum("v1"), uploaded_by=u_an.id, note="Bản thảo đầu"))
    session.add(Note(document_id=docs[2].id, user_id=u_an.id, note="Cần nộp trước thứ 6"))

    await session.commit()
    return docs

# =========================================================
# 8. SEED SHARES, NOTIFICATIONS, LOGS, JOBS
# =========================================================
async def seed_interactions(session: AsyncSession, users, workspaces, docs):
    print("7. Seeding Shares, Notifications, Favorites, Logs, and Jobs...")
    u_an = users["sv_an"]
    u_binh = users["sv_binh"]
    u_cuong = users["sv_cuong"]

    # 1. Share
    share = DocumentShare(document_id=docs[0].id, source_document_id=docs[0].id, from_user_id=u_an.id, to_user_id=u_cuong.id, share_type="personal_send")
    session.add(share)

    # 2. Notifications
    notifications = [
        Notification(user_id=u_cuong.id, type="invite", workspace_id=workspaces["group"].id, message="An đã mời bạn vào Nhóm"),
        Notification(user_id=u_binh.id, type="new_document", workspace_id=workspaces["class"].id, document_id=docs[2].id, message="Thầy Tuấn đã tải lên BTL"),
    ]
    session.add_all(notifications)

    # 3. Favorites (Sử dụng Model Favorite thay vì Table)
    session.add(Favorite(user_id=u_an.id, document_id=docs[2].id))
    session.add(Favorite(user_id=u_binh.id, document_id=docs[2].id))

    # 4. Logs
    logs = [DownloadLog(document_id=docs[2].id, user_id=u_an.id, action="view")]
    session.add_all(logs)

    # 5. Jobs
    jobs = [ProcessingJob(document_id=docs[0].id, job_type="virus_scan", status="done", result={"safe": True})]
    session.add_all(jobs)

    await session.commit()

# =========================================================
# MAIN FUNCTION
# =========================================================
async def seed_database():
    print("=" * 60)
    print("STARTING DATABASE SEEDING (FULL PHASE 2 SCHEMA)")
    print("=" * 60)

    async with AsyncSessionLocal() as session:
        try:
            # 1. Dọn dẹp dữ liệu cũ (gọi hàm bạn cung cấp)
            await clear_data(session)

            # 2. Khởi tạo dữ liệu theo đúng thứ tự logic
            faculties, classes = await seed_academics(session)
            users = await seed_users(session, faculties, classes)
            workspaces = await seed_workspaces_and_members(session, users, faculties, classes)
            classifications = await seed_classifications(session, users)
            trash_batch = await seed_trash_batches(session, users, workspaces)
            docs = await seed_documents(session, users, workspaces, classifications, trash_batch)
            await seed_interactions(session, users, workspaces, docs)
            
            print("=" * 60)
            print("DATABASE SEEDED SUCCESSFULLY!")
            print("=" * 60)
        except Exception as error:
            await session.rollback()
            print("SEEDING FAILED!")
            print(error)
            raise

if __name__ == "__main__":
    asyncio.run(seed_database())