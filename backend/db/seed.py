import asyncio
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
from app.core.database import AsyncSessionLocal

from app.models.user import User
from app.models.category import Category
from app.models.tag import Tag
from app.models.document import Document
from app.models.document_tag import DocumentTag
from app.models.document_version import DocumentVersion
from app.models.note import Note
from app.models.favorite import Favorite
from app.models.download_log import DownloadLog
from app.models.processing_job import ProcessingJob


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def generate_checksum(text: str) -> str:
    """
    Tạo SHA-256 checksum giả lập từ một chuỗi.
    Dùng để seed dữ liệu document.
    """
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def clear_data(session: AsyncSession):
    """
    Xóa dữ liệu cũ nếu muốn seed lại từ đầu.

    Hiện tại không tự động gọi hàm này để tránh
    xóa dữ liệu thật trong database.
    """
    pass


# =========================================================
# SEED USERS
# =========================================================

async def seed_users(session: AsyncSession):
    print("Seeding users...")

    users_data = [
        {
            "username": "nguyenvana",
            "email": "nguyenvana@example.com",
            "password_hash": "hashed_password_123",
            "full_name": "Nguyễn Văn A",
            "role": "personal",
        },
        {
            "username": "tranthib",
            "email": "tranthib@example.com",
            "password_hash": "hashed_password_123",
            "full_name": "Trần Thị B",
            "role": "personal",
        },
        {
            "username": "admin",
            "email": "admin@example.com",
            "password_hash": "hashed_admin_password",
            "full_name": "System Administrator",
            "role": "admin",
        },
    ]

    users = []

    for data in users_data:
        result = await session.execute(
            select(User).where(User.username == data["username"])
        )

        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"  User '{data['username']}' already exists.")
            users.append(existing_user)
        else:
            user = User(**data)

            session.add(user)
            users.append(user)

    await session.commit()

    # Refresh để lấy ID
    for user in users:
        await session.refresh(user)

    print("Users seeded successfully.")

    return users


# =========================================================
# SEED CATEGORIES
# =========================================================

async def seed_categories(
    session: AsyncSession,
    users: list[User]
):
    print("Seeding categories...")

    user1 = users[0]
    user2 = users[1]

    # -------------------------
    # Categories cấp 1
    # -------------------------

    categories_data = [
        {
            "owner_id": user1.id,
            "name": "Công nghệ thông tin",
        },
        {
            "owner_id": user1.id,
            "name": "Toán học",
        },
        {
            "owner_id": user1.id,
            "name": "Tiếng Anh",
        },
        {
            "owner_id": user1.id,
            "name": "Tài liệu cá nhân",
        },
        {
            "owner_id": user2.id,
            "name": "Khoa học máy tính",
        },
    ]

    categories = {}

    for data in categories_data:

        result = await session.execute(
            select(Category).where(
                Category.owner_id == data["owner_id"],
                Category.name == data["name"]
            )
        )

        existing = result.scalar_one_or_none()

        if existing:
            category = existing
        else:
            category = Category(**data)
            session.add(category)
            await session.flush()

        categories[data["name"]] = category

    # -------------------------
    # Categories cấp 2
    # -------------------------

    subcategories_data = [
        {
            "owner_id": user1.id,
            "name": "Lập trình Python",
            "parent_id": categories["Công nghệ thông tin"].id,
        },
        {
            "owner_id": user1.id,
            "name": "Cơ sở dữ liệu",
            "parent_id": categories["Công nghệ thông tin"].id,
        },
        {
            "owner_id": user1.id,
            "name": "Thuật toán",
            "parent_id": categories["Công nghệ thông tin"].id,
        },
        {
            "owner_id": user1.id,
            "name": "Giải tích",
            "parent_id": categories["Toán học"].id,
        },
        {
            "owner_id": user1.id,
            "name": "IELTS",
            "parent_id": categories["Tiếng Anh"].id,
        },
    ]

    for data in subcategories_data:

        result = await session.execute(
            select(Category).where(
                Category.owner_id == data["owner_id"],
                Category.name == data["name"]
            )
        )

        existing = result.scalar_one_or_none()

        if not existing:
            session.add(Category(**data))

    await session.commit()

    print("Categories seeded successfully.")

    # Query lại toàn bộ category
    result = await session.execute(select(Category))
    return result.scalars().all()


# =========================================================
# SEED TAGS
# =========================================================

async def seed_tags(
    session: AsyncSession,
    users: list[User]
):
    print("Seeding tags...")

    user1 = users[0]

    tags_data = [
        {
            "owner_id": user1.id,
            "name": "Quan trọng",
            "color": "#FF0000",
        },
        {
            "owner_id": user1.id,
            "name": "Cần đọc",
            "color": "#FFA500",
        },
        {
            "owner_id": user1.id,
            "name": "Đã đọc",
            "color": "#00AA00",
        },
        {
            "owner_id": user1.id,
            "name": "Lập trình",
            "color": "#0066FF",
        },
        {
            "owner_id": user1.id,
            "name": "Database",
            "color": "#800080",
        },
    ]

    tags = {}

    for data in tags_data:

        result = await session.execute(
            select(Tag).where(
                Tag.owner_id == data["owner_id"],
                Tag.name == data["name"]
            )
        )

        existing = result.scalar_one_or_none()

        if existing:
            tag = existing
        else:
            tag = Tag(**data)
            session.add(tag)
            await session.flush()

        tags[data["name"]] = tag

    # Tạo tag con cho "Lập trình"
    programming_tag = tags["Lập trình"]

    result = await session.execute(
        select(Tag).where(
            Tag.owner_id == user1.id,
            Tag.name == "Python"
        )
    )

    python_tag = result.scalar_one_or_none()

    if not python_tag:
        python_tag = Tag(
            owner_id=user1.id,
            name="Python",
            color="#3776AB",
            parent_id=programming_tag.id
        )

        session.add(python_tag)

    await session.commit()

    print("Tags seeded successfully.")

    result = await session.execute(select(Tag))

    return result.scalars().all()


# =========================================================
# SEED DOCUMENTS
# =========================================================

async def seed_documents(
    session: AsyncSession,
    users: list[User],
    categories: list[Category]
):
    print("Seeding documents...")

    user1 = users[0]
    user2 = users[1]

    # Tìm category theo tên
    category_map = {
        category.name: category
        for category in categories
    }

    documents_data = [
        {
            "owner_id": user1.id,
            "category_id": category_map["Lập trình Python"].id,
            "title": "Python Programming Basics",
            "description": "Tài liệu cơ bản về lập trình Python.",
            "file_path": "/uploads/python/python_programming_basics.pdf",
            "file_type": "application/pdf",
            "file_size": 2457600,
            "checksum": generate_checksum(
                "python_programming_basics.pdf"
            ),
            "content": """
Python là một ngôn ngữ lập trình phổ biến.
Tài liệu này giới thiệu biến, kiểu dữ liệu,
câu điều kiện, vòng lặp, hàm và lập trình hướng đối tượng.
            """,
            "metadata": {
                "author": "Nguyễn Văn A",
                "pages": 120,
                "published_year": 2025,
                "language": "vi"
            },
            "is_important": True,
        },

        {
            "owner_id": user1.id,
            "category_id": category_map["Cơ sở dữ liệu"].id,
            "title": "Database System Concepts",
            "description": "Tài liệu về hệ quản trị cơ sở dữ liệu.",
            "file_path": "/uploads/database/database_system_concepts.pdf",
            "file_type": "application/pdf",
            "file_size": 5242880,
            "checksum": generate_checksum(
                "database_system_concepts.pdf"
            ),
            "content": """
Tài liệu trình bày các khái niệm về cơ sở dữ liệu,
SQL, PostgreSQL, mô hình quan hệ,
chuẩn hóa dữ liệu và transaction.
            """,
            "metadata": {
                "author": "Abraham Silberschatz",
                "pages": 850,
                "published_year": 2024,
                "language": "en"
            },
            "is_important": True,
        },

        {
            "owner_id": user1.id,
            "category_id": category_map["Thuật toán"].id,
            "title": "Introduction to Algorithms",
            "description": "Tài liệu học về cấu trúc dữ liệu và thuật toán.",
            "file_path": "/uploads/algorithms/introduction_to_algorithms.pdf",
            "file_type": "application/pdf",
            "file_size": 7340032,
            "checksum": generate_checksum(
                "introduction_to_algorithms.pdf"
            ),
            "content": """
Các chủ đề bao gồm sorting, searching,
graph algorithms, dynamic programming
và độ phức tạp thuật toán.
            """,
            "metadata": {
                "author": "Thomas H. Cormen",
                "pages": 1300,
                "published_year": 2023,
                "language": "en"
            },
            "is_important": False,
        },

        {
            "owner_id": user1.id,
            "category_id": category_map["IELTS"].id,
            "title": "IELTS Writing Practice",
            "description": "Tài liệu luyện kỹ năng IELTS Writing.",
            "file_path": "/uploads/ielts/ielts_writing_practice.pdf",
            "file_type": "application/pdf",
            "file_size": 3145728,
            "checksum": generate_checksum(
                "ielts_writing_practice.pdf"
            ),
            "content": """
Tài liệu cung cấp các bài mẫu IELTS Writing Task 1
và Task 2, từ vựng học thuật,
cấu trúc bài luận và cách phát triển ý tưởng.
            """,
            "metadata": {
                "author": "Cambridge",
                "pages": 200,
                "published_year": 2025,
                "language": "en"
            },
            "is_important": False,
        },

        {
            "owner_id": user2.id,
            "category_id": category_map["Khoa học máy tính"].id,
            "title": "Computer Networks",
            "description": "Tài liệu về mạng máy tính.",
            "file_path": "/uploads/networks/computer_networks.pdf",
            "file_type": "application/pdf",
            "file_size": 6291456,
            "checksum": generate_checksum(
                "computer_networks.pdf"
            ),
            "content": """
Computer networking bao gồm TCP/IP,
UDP, routing, switching, IPv4, IPv6
và các giao thức mạng.
            """,
            "metadata": {
                "author": "Andrew S. Tanenbaum",
                "pages": 900,
                "published_year": 2024,
                "language": "en"
            },
            "is_important": True,
        },
    ]

    documents = []

    for data in documents_data:

        result = await session.execute(
            select(Document).where(
                Document.checksum == data["checksum"]
            )
        )

        existing = result.scalar_one_or_none()

        if existing:
            print(
                f"  Document '{data['title']}' already exists."
            )
            document = existing
        else:
            document = Document(**data)
            session.add(document)
            await session.flush()

        documents.append(document)

    await session.commit()

    for document in documents:
        await session.refresh(document)

    print("Documents seeded successfully.")

    return documents


# =========================================================
# SEED DOCUMENT TAGS
# =========================================================

async def seed_document_tags(
    session: AsyncSession,
    documents: list[Document],
    tags: list[Tag]
):
    print("Seeding document tags...")

    document_map = {
        document.title: document
        for document in documents
    }

    tag_map = {
        tag.name: tag
        for tag in tags
    }

    relations = [
        (
            "Python Programming Basics",
            "Lập trình"
        ),
        (
            "Python Programming Basics",
            "Python"
        ),
        (
            "Python Programming Basics",
            "Cần đọc"
        ),
        (
            "Database System Concepts",
            "Database"
        ),
        (
            "Database System Concepts",
            "Quan trọng"
        ),
        (
            "Introduction to Algorithms",
            "Lập trình"
        ),
        (
            "IELTS Writing Practice",
            "Cần đọc"
        ),
        (
            "IELTS Writing Practice",
            "Đã đọc"
        ),
    ]

    for document_title, tag_name in relations:

        document = document_map.get(document_title)
        tag = tag_map.get(tag_name)

        if not document or not tag:
            continue

        result = await session.execute(
            select(DocumentTag).where(
                DocumentTag.document_id == document.id,
                DocumentTag.tag_id == tag.id
            )
        )

        existing = result.scalar_one_or_none()

        if not existing:
            relation = DocumentTag(
                document_id=document.id,
                tag_id=tag.id
            )

            session.add(relation)

    await session.commit()

    print("Document tags seeded successfully.")


# =========================================================
# SEED DOCUMENT VERSIONS
# =========================================================

async def seed_document_versions(
    session: AsyncSession,
    users: list[User],
    documents: list[Document]
):
    print("Seeding document versions...")

    user1 = users[0]

    document = documents[0]

    versions_data = [
        {
            "document_id": document.id,
            "version_no": 1,
            "file_path": "/uploads/versions/python_basics_v1.pdf",
            "checksum": generate_checksum("python_basics_v1.pdf"),
            "uploaded_by": user1.id,
            "note": "Phiên bản đầu tiên.",
        },
        {
            "document_id": document.id,
            "version_no": 2,
            "file_path": "/uploads/versions/python_basics_v2.pdf",
            "checksum": generate_checksum("python_basics_v2.pdf"),
            "uploaded_by": user1.id,
            "note": "Bổ sung nội dung về OOP.",
        },
    ]

    for data in versions_data:

        result = await session.execute(
            select(DocumentVersion).where(
                DocumentVersion.document_id == data["document_id"],
                DocumentVersion.version_no == data["version_no"]
            )
        )

        existing = result.scalar_one_or_none()

        if not existing:
            session.add(DocumentVersion(**data))

    await session.commit()

    print("Document versions seeded successfully.")


# =========================================================
# SEED NOTES
# =========================================================

async def seed_notes(
    session: AsyncSession,
    users: list[User],
    documents: list[Document]
):
    print("Seeding notes...")

    notes_data = [
        {
            "document_id": documents[0].id,
            "user_id": users[0].id,
            "note": "Cần đọc kỹ phần lập trình hướng đối tượng.",
        },
        {
            "document_id": documents[1].id,
            "user_id": users[0].id,
            "note": "Quan trọng: xem lại phần chuẩn hóa dữ liệu.",
        },
        {
            "document_id": documents[3].id,
            "user_id": users[0].id,
            "note": "Luyện ít nhất một bài Task 2 mỗi ngày.",
        },
    ]

    for data in notes_data:

        result = await session.execute(
            select(Note).where(
                Note.document_id == data["document_id"],
                Note.user_id == data["user_id"],
                Note.note == data["note"]
            )
        )

        existing = result.scalar_one_or_none()

        if not existing:
            session.add(Note(**data))

    await session.commit()

    print("Notes seeded successfully.")


# =========================================================
# SEED FAVORITES
# =========================================================

async def seed_favorites(
    session: AsyncSession,
    users: list[User],
    documents: list[Document]
):
    print("Seeding favorites...")

    favorites_data = [
        {
            "user_id": users[0].id,
            "document_id": documents[0].id,
        },
        {
            "user_id": users[0].id,
            "document_id": documents[1].id,
        },
        {
            "user_id": users[0].id,
            "document_id": documents[3].id,
        },
        {
            "user_id": users[1].id,
            "document_id": documents[4].id,
        },
    ]

    for data in favorites_data:

        result = await session.execute(
            select(Favorite).where(
                Favorite.user_id == data["user_id"],
                Favorite.document_id == data["document_id"]
            )
        )

        existing = result.scalar_one_or_none()

        if not existing:
            session.add(Favorite(**data))

    await session.commit()

    print("Favorites seeded successfully.")


# =========================================================
# SEED DOWNLOAD LOGS
# =========================================================

async def seed_download_logs(
    session: AsyncSession,
    users: list[User],
    documents: list[Document]
):
    print("Seeding download logs...")

    logs_data = [
        {
            "document_id": documents[0].id,
            "user_id": users[0].id,
            "action": "view",
        },
        {
            "document_id": documents[0].id,
            "user_id": users[0].id,
            "action": "download",
        },
        {
            "document_id": documents[1].id,
            "user_id": users[0].id,
            "action": "view",
        },
        {
            "document_id": documents[3].id,
            "user_id": users[0].id,
            "action": "view",
        },
        {
            "document_id": documents[4].id,
            "user_id": users[1].id,
            "action": "download",
        },
    ]

    for data in logs_data:
        session.add(DownloadLog(**data))

    await session.commit()

    print("Download logs seeded successfully.")


# =========================================================
# SEED PROCESSING JOBS
# =========================================================

async def seed_processing_jobs(
    session: AsyncSession,
    documents: list[Document]
):
    print("Seeding processing jobs...")

    jobs_data = [
        {
            "document_id": documents[0].id,
            "job_type": "ocr",
            "status": "done",
            "result": {
                "pages_processed": 120,
                "characters_extracted": 150000
            },
            "finished_at": datetime.now(),
        },
        {
            "document_id": documents[0].id,
            "job_type": "thumbnail",
            "status": "done",
            "result": {
                "thumbnail_path": "/thumbnails/python_basics.jpg"
            },
            "finished_at": datetime.now(),
        },
        {
            "document_id": documents[1].id,
            "job_type": "ocr",
            "status": "done",
            "result": {
                "pages_processed": 850
            },
            "finished_at": datetime.now(),
        },
        {
            "document_id": documents[3].id,
            "job_type": "ocr",
            "status": "running",
            "result": None,
            "finished_at": None,
        },
    ]

    for data in jobs_data:
        session.add(ProcessingJob(**data))

    await session.commit()

    print("Processing jobs seeded successfully.")


# =========================================================
# MAIN SEED FUNCTION
# =========================================================

async def seed_database():

    print("=" * 60)
    print("STARTING DATABASE SEEDING")
    print("=" * 60)

    async with AsyncSessionLocal() as session:

        try:

            # 1. Users
            users = await seed_users(session)

            # 2. Categories
            categories = await seed_categories(
                session,
                users
            )

            # 3. Tags
            tags = await seed_tags(
                session,
                users
            )

            # 4. Documents
            documents = await seed_documents(
                session,
                users,
                categories
            )

            # 5. Document <-> Tag
            await seed_document_tags(
                session,
                documents,
                tags
            )

            # 6. Versions
            await seed_document_versions(
                session,
                users,
                documents
            )

            # 7. Notes
            await seed_notes(
                session,
                users,
                documents
            )

            # 8. Favorites
            await seed_favorites(
                session,
                users,
                documents
            )

            # 9. Download logs
            await seed_download_logs(
                session,
                users,
                documents
            )

            # 10. Processing jobs
            await seed_processing_jobs(
                session,
                documents
            )

            print("=" * 60)
            print("DATABASE SEEDED SUCCESSFULLY!")
            print("=" * 60)

        except Exception as error:

            await session.rollback()

            print("=" * 60)
            print("SEEDING FAILED!")
            print(error)
            print("=" * 60)

            raise


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":
    asyncio.run(seed_database())