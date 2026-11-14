"""
Seed dataset phục vụ đo đạc hiệu năng (Performance Baseline & Audit).
Mục tiêu: Đạt ~1.000 tài liệu cho user 'nguyen' (kho cá nhân + nhóm id 22).
Chạy:
    cd /Users/caotiendattx/Developer/Do_An_Co_So/Foundation-Project
    PYTHONPATH=backend .venv/bin/python backend/db/seed_perf_documents.py
"""

import asyncio
import hashlib
import random
from datetime import datetime, timedelta
from typing import List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.document_stats import DocumentStats
from app.models.tag import Tag
from app.models.folder import Folder
from app.models.document_tag import document_tags

TARGET_TOTAL = 1000
TARGET_PERSONAL = 850
TARGET_GROUP = 150
WORKSPACE_ID = 22

CATEGORIES_TITLES = [
    ("Đại số tuyến tính - Bài tập chương {i}", "pdf", "application/pdf"),
    ("Giải tích 2 - Đề thi giữa kỳ {i}", "pdf", "application/pdf"),
    ("Cấu trúc dữ liệu và giải thuật - Slide {i}", "pdf", "application/pdf"),
    ("Báo cáo môn Kiến trúc phần mềm - Lần {i}", "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ("Bảng điểm và tiến độ học tập kỳ {i}", "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ("Sơ đồ kiến trúc microservices phiên bản {i}", "png", "image/png"),
    ("Ảnh chụp bảng bài giảng tuần {i}", "jpg", "image/jpeg"),
    ("Source code bài tập lớn Lab {i}", "py", "text/x-python"),
    ("Tài liệu hướng dẫn thực hành Docker {i}", "pdf", "application/pdf"),
    ("Tổng hợp ghi chú ôn tập cuối kỳ môn học {i}", "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
]

def make_checksum(seed: str) -> str:
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()

async def seed_perf_data():
    async with AsyncSessionLocal() as session:
        # 1. Tìm user nguyen
        user_res = await session.execute(select(User).where(User.username == "nguyen"))
        user = user_res.scalar_one_or_none()
        if not user:
            print("❌ Không tìm thấy user 'nguyen'. Hãy tạo hoặc seed user trước.")
            return

        print(f"👤 Tìm thấy user '{user.username}' (id: {user.id})")

        # 2. Kiểm tra số tài liệu hiện tại
        p_count_res = await session.execute(
            select(func.count(Document.id)).where(
                Document.owner_id == user.id,
                Document.workspace_id.is_(None),
                Document.is_deleted == False
            )
        )
        current_personal = p_count_res.scalar() or 0

        g_count_res = await session.execute(
            select(func.count(Document.id)).where(
                Document.workspace_id == WORKSPACE_ID,
                Document.is_deleted == False
            )
        )
        current_group = g_count_res.scalar() or 0

        print(f"📊 Hiện có: {current_personal} tài liệu cá nhân, {current_group} tài liệu nhóm {WORKSPACE_ID}")

        needed_personal = max(0, TARGET_PERSONAL - current_personal)
        needed_group = max(0, TARGET_GROUP - current_group)

        if needed_personal == 0 and needed_group == 0:
            print(f"✅ Đã có đủ ít nhất {TARGET_TOTAL} tài liệu. Không cần seed thêm.")
            return

        print(f"🚀 Bắt đầu seed: {needed_personal} tài liệu cá nhân, {needed_group} tài liệu nhóm...")

        # Lấy tags sẵn có
        tag_res = await session.execute(select(Tag.id).limit(30))
        available_tag_ids = [r[0] for r in tag_res.all()]

        # Lấy folders của nguyen
        folder_res = await session.execute(
            select(Folder.id).where(Folder.owner_id == user.id)
        )
        available_folder_ids = [r[0] for r in folder_res.all()]

        base_time = datetime.now() - timedelta(days=90)
        docs_to_insert = []
        stats_to_insert = []
        tag_associations = []

        total_needed = needed_personal + needed_group
        created_count = 0

        # Tạo bundles trước
        bundle_parents = []

        for i in range(1, total_needed + 1):
            is_personal = (i <= needed_personal)
            target_ws = None if is_personal else WORKSPACE_ID

            template = random.choice(CATEGORIES_TITLES)
            title = f"{template[0].format(i=i + 100)}"
            ext = template[1]
            mime = template[2]

            created_at = base_time + timedelta(hours=random.randint(1, 2000), minutes=random.randint(0, 59))
            file_size = random.randint(15_000, 8_500_000)
            checksum = make_checksum(f"perf-seed-{user.id}-{target_ws}-{i}-{datetime.now().timestamp()}")

            # 5% tỉ lệ là bundle
            is_bundle = (random.random() < 0.05 and len(bundle_parents) < 15)
            
            # Gán thumbnail mẫu (nếu là PDF/ảnh)
            thumbnail_path = f"storage/thumbnails/sample_{ext}.jpg" if ext in ["pdf", "jpg", "png"] else None

            folder_id = random.choice(available_folder_ids) if (available_folder_ids and random.random() < 0.25) else None

            doc = Document(
                owner_id=user.id,
                workspace_id=target_ws,
                title=title,
                description=f"Tài liệu tự động tạo phục vụ kiểm thử hiệu năng #{i}",
                file_path=f"storage/{'personal' if is_personal else 'groups'}/doc_{i}.{ext}",
                thumbnail_path=thumbnail_path,
                file_type=mime,
                file_size=file_size,
                checksum=checksum,
                is_bundle=is_bundle,
                is_public=False,
                is_deleted=False,
                created_at=created_at,
            )
            session.add(doc)
            await session.flush() # Lấy doc.id

            if is_bundle:
                bundle_parents.append(doc.id)

            # Thống kê (DocumentStats)
            views = random.randint(0, 250)
            downloads = random.randint(0, views // 2 + 1)
            trending = float(views * 1.5 + downloads * 3.0 + random.uniform(0.0, 10.0))

            stat = DocumentStats(
                document_id=doc.id,
                view_count=views,
                download_count=downloads,
                share_count=random.randint(0, 10),
                trending_score=trending,
            )
            session.add(stat)

            # Gán ngẫu nhiên 1 - 3 tags
            if available_tag_ids:
                chosen_tags = random.sample(available_tag_ids, k=min(len(available_tag_ids), random.randint(1, 3)))
                for t_id in chosen_tags:
                    await session.execute(
                        document_tags.insert().values(document_id=doc.id, tag_id=t_id)
                    )

            created_count += 1
            if created_count % 100 == 0:
                await session.commit()
                print(f"  ⚡ Đã tạo {created_count}/{total_needed} tài liệu...")

        await session.commit()
        print(f"🎉 Hoàn tất seed! Đã tạo thành công {created_count} tài liệu cho user 'nguyen'.")

if __name__ == "__main__":
    asyncio.run(seed_perf_data())
