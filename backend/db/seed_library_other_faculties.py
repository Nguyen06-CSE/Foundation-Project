"""
Script seed dữ liệu học liệu (môn học + tài liệu công khai + đánh giá)
cho các khoa khác trong trường ĐH Đà Lạt.
CHÚ Ý: TUYỆT ĐỐI KHÔNG TẠO DỮ LIỆU CHO KHOA CÔNG NGHỆ THÔNG TIN (faculty_id = 1, code = 'CNTT').
"""

import asyncio
import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, and_
from app.core.database import AsyncSessionLocal
from app.models.faculty import Faculty
from app.models.subject import Subject
from app.models.document import Document
from app.models.document_stats import DocumentStats
from app.models.document_rating import DocumentRating
from app.models.user import User


OTHER_FACULTY_SUBJECTS = {
    "KTQTKD": {
        "subjects": [
            ("KTVM", "Kinh tế Vĩ mô", "Lý thuyết kinh tế vĩ mô cơ bản và chính sách"),
            ("KTCB", "Kế toán Đại cương", "Nguyên lý kế toán tài chính và định khoản"),
            ("QTKD", "Quản trị học căn bản", "Các chức năng hoạch định, tổ chức, lãnh đạo"),
            ("MKT", "Nguyên lý Marketing", "Nghiên cứu thị trường và chiến lược 4P"),
        ],
        "docs": [
            ("Giáo trình Kinh tế Vĩ mô ĐH Đà Lạt", "KTVM", "Giáo trình", "2024-2025", "pdf"),
            ("Tổng hợp Đề thi và Đáp án Kế toán", "KTCB", "Đề thi", "2023-2024", "pdf"),
            ("Slide Bài giảng Quản trị học", "QTKD", "Slide bài giảng", "2024-2025", "pptx"),
            ("Bài tập tình huống Marketing thực tế", "MKT", "Bài tập", "2024-2025", "docx"),
        ],
    },
    "NN": {
        "subjects": [
            ("TNA1", "Tiếng Anh Căn bản 1", "Ngữ pháp và từ vựng tiếng Anh tổng quát bậc 1"),
            ("TNCG", "Tiếng Anh Chuyên ngành IT", "Thuật ngữ và văn bản kỹ thuật công nghệ thông tin"),
            ("NPA", "Ngữ pháp Tiếng Anh Nâng cao", "Chuyên đề ngữ pháp nâng cao và cấu trúc học thuật"),
            ("TAQT", "Tiếng Anh Giao tiếp Quốc tế", "Luyện nghe nói và phản xạ giao tiếp quốc tế"),
        ],
        "docs": [
            ("Tài liệu hướng dẫn Tiếng Anh Căn bản 1", "TNA1", "Giáo trình", "2024-2025", "pdf"),
            ("Glossary Tiếng Anh Kỹ thuật IT", "TNCG", "Giáo trình", "2024-2025", "pdf"),
            ("Bộ đề thi TOEIC Mock Test 2024", "TAQT", "Đề thi", "2024-2025", "pdf"),
        ],
    },
    "TOAN": {
        "subjects": [
            ("TACC", "Toán Cao cấp", "Hàm số một biến, đạo hàm, tích phân và ma trận"),
            ("XSTK", "Xác suất Thống kê", "Lý thuyết xác suất và suy diễn thống kê ứng dụng"),
            ("DSTT", "Đại số Tuyến tính", "Không gian vector, ma trận và dạng toàn phương"),
            ("GTH", "Giải tích 1", "Phép tính vi phân và tích phân của hàm một biến"),
        ],
        "docs": [
            ("Giáo trình Xác suất và Thống kê Toán học", "XSTK", "Giáo trình", "2024-2025", "pdf"),
            ("Tuyển tập bài tập Đại số Tuyến tính có lời giải", "DSTT", "Bài tập", "2023-2024", "pdf"),
            ("Đề thi cuối kỳ Giải tích 1 các năm", "GTH", "Đề thi", "2024-2025", "pdf"),
        ],
    },
    "VL": {
        "subjects": [
            ("VLDC1", "Vật lý Đại cương 1", "Cơ học và nhiệt động lực học ứng dụng"),
            ("CHLT", "Cơ học Lượng tử", "Các tiên đề lượng tử và phương trình Schrodinger"),
            ("VLHN", "Nhập môn Vật lý Hạt nhân", "Cấu trúc hạt nhân và ứng dụng năng lượng hạt nhân"),
        ],
        "docs": [
            ("Giáo trình Vật lý Đại cương 1", "VLDC1", "Giáo trình", "2024-2025", "pdf"),
            ("Slide Bài giảng Vật lý Hạt nhân", "VLHN", "Slide bài giảng", "2024-2025", "pptx"),
        ],
    },
    "HOA": {
        "subjects": [
            ("HDC", "Hóa học Đại cương", "Cấu tạo nguyên tử, liên kết hóa học và dung dịch"),
            ("HHC", "Hóa Hữu cơ Cơ sở", "Các nhóm định chức và cơ chế phản ứng hữu cơ"),
            ("KHVL", "Khoa học Vật liệu", "Cấu trúc vật liệu kim loại, polymer và gốm"),
        ],
        "docs": [
            ("Giáo trình Hóa học Đại cương", "HDC", "Giáo trình", "2024-2025", "pdf"),
            ("Bài tập Hóa Hữu cơ có hướng dẫn giải", "HHC", "Bài tập", "2024-2025", "docx"),
        ],
    },
    "SH": {
        "subjects": [
            ("SHDC", "Sinh học Đại cương", "Cơ sở phân tử và tế bào học của sự sống"),
            ("DTH", "Di truyền học", "Di truyền Mendel, di truyền phân tử và biến dị"),
            ("VSV", "Vi sinh vật học", "Hình thái, sinh lý và ứng dụng của vi sinh vật"),
        ],
        "docs": [
            ("Giáo trình Sinh học Tế bào và Phân tử", "SHDC", "Giáo trình", "2024-2025", "pdf"),
            ("Đề thi học kỳ Di truyền học", "DTH", "Đề thi", "2023-2024", "pdf"),
        ],
    },
    "LH": {
        "subjects": [
            ("LDS", "Luật Dân sự Việt Nam", "Chế định tài sản, quyền sở hữu và hợp đồng dân sự"),
            ("LHS", "Luật Hình sự và Tố tụng", "Tội phạm, hình phạt và trình tự tố tụng hình sự"),
            ("LTM", "Luật Thương mại", "Chủ thể kinh doanh và hoạt động thương mại hàng hóa"),
        ],
        "docs": [
            ("Bình luận án Luật Dân sự", "LDS", "Giáo trình", "2024-2025", "pdf"),
            ("Tài liệu bài giảng Luật Thương mại", "LTM", "Slide bài giảng", "2024-2025", "pptx"),
        ],
    },
    "Su": {
        "subjects": [
            ("LSDCS", "Lịch sử Đảng Cộng sản Việt Nam", "Các mốc lịch sử phát triển và đường lối của Đảng"),
            ("LSVN", "Lịch sử Việt Nam Cổ trung đại", "Diễn trình lịch sử Việt Nam từ nguồn gốc đến thế kỷ XIX"),
            ("LSTG", "Lịch sử Văn minh Thế giới", "Các nền văn minh phương Đông và phương Tây"),
        ],
        "docs": [
            ("Tài liệu ôn thi Lịch sử Đảng Cộng sản", "LSDCS", "Đề thi", "2024-2025", "pdf"),
            ("Đề cương Văn minh Thế giới", "LSTG", "Giáo trình", "2024-2025", "docx"),
        ],
    },
    "VH": {
        "subjects": [
            ("VHDC", "Văn học Dân gian Việt Nam", "Thể loại truyền thuyết, cổ tích và ca dao dân ca"),
            ("NGH", "Dẫn luận Ngôn ngữ học", "Ngữ âm, từ vựng và ngữ pháp đại cương"),
            ("VHHĐ", "Văn học Hiện đại", "Văn học Việt Nam giai đoạn 1945 đến nay"),
        ],
        "docs": [
            ("Tuyển tập tiểu luận Văn học Hiện đại", "VHHĐ", "Giáo trình", "2024-2025", "pdf"),
        ],
    },
    "DL": {
        "subjects": [
            ("QTLH", "Quản trị Kinh doanh Lữ hành", "Thiết kế tour và điều hành dịch vụ du lịch"),
            ("QTKS", "Quản trị Khách sạn - Nhà hàng", "Nghiệp vụ buồng phòng, lễ tân và F&B"),
            ("DLST", "Du lịch Sinh thái và Môi trường", "Khai thác du lịch gắn liền với bảo tồn sinh thái"),
        ],
        "docs": [
            ("Giáo trình Quản trị Lữ hành", "QTLH", "Giáo trình", "2024-2025", "pdf"),
            ("Cẩm nang nghiệp vụ Khách sạn - Nhà hàng", "QTKS", "Giáo trình", "2024-2025", "pdf"),
        ],
    },
    "KHMT": {
        "subjects": [
            ("KHMTCB", "Khoa học Môi trường Căn bản", "Hệ sinh thái, ô nhiễm môi trường và biện pháp giảm thiểu"),
            ("BDKH", "Biến đổi Khí hậu Toàn cầu", "Tác động của biến đổi khí hậu và chiến lược thích ứng"),
        ],
        "docs": [
            ("Báo cáo chuyên đề Biến đổi Khí hậu tại Tây Nguyên", "BDKH", "Giáo trình", "2024-2025", "pdf"),
        ],
    },
    "XH": {
        "subjects": [
            ("XHHDC", "Xã hội học Đại cương", "Cấu trúc xã hội, thiết chế và biến đổi xã hội"),
            ("CTXH", "Nhập môn Công tác Xã hội", "Phương pháp can thiệp cá nhân, nhóm và cộng đồng"),
        ],
        "docs": [
            ("Giáo trình Nhập môn Công tác Xã hội", "CTXH", "Giáo trình", "2024-2025", "pdf"),
        ],
    },
    "QT": {
        "subjects": [
            ("QHQT", "Quan hệ Quốc tế Đương đại", "Chính sách đối ngoại và xu thế toàn cầu hóa"),
            ("TCQT", "Thể chế và Tổ chức Quốc tế", "Vai trò của Liên Hợp Quốc, ASEAN, WTO"),
        ],
        "docs": [
            ("Tài liệu thảo luận Quan hệ Quốc tế", "QHQT", "Slide bài giảng", "2024-2025", "pptx"),
        ],
    },
    "SP": {
        "subjects": [
            ("TLHGD", "Tâm lý học Giáo dục", "Đặc điểm tâm lý lứa tuổi và động lực học tập"),
            ("GDH", "Giáo dục học Căn bản", "Nguyên lý giáo dục và phương pháp sư phạm hiện đại"),
        ],
        "docs": [
            ("Giáo trình Tâm lý học Lứa tuổi và Sư phạm", "TLHGD", "Giáo trình", "2024-2025", "pdf"),
            ("Bộ câu hỏi ôn tập Giáo dục học", "GDH", "Đề thi", "2024-2025", "docx"),
        ],
    },
}


def checksum_str(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def seed_other_faculties():
    async with AsyncSessionLocal() as session:
        # Lấy danh sách khoa
        faculties_res = await session.execute(select(Faculty))
        faculties = {f.code: f for f in faculties_res.scalars().all()}

        # Lấy danh sách giảng viên / admin để gán làm người tải lên
        teachers_res = await session.execute(
            select(User).where(User.role.in_(["teacher", "faculty_admin", "school_admin", "student"]))
        )
        users = teachers_res.scalars().all()
        default_user = users[0] if users else None
        if not default_user:
            print("Không tìm thấy user nào trong DB để gán chủ sở hữu.")
            return

        total_subjects_added = 0
        total_docs_added = 0

        for fac_code, data in OTHER_FACULTY_SUBJECTS.items():
            faculty = faculties.get(fac_code)
            if not faculty:
                continue

            # BẢO VỆ TUYỆT ĐỐI: Không bao giờ động vào khoa CNTT
            if faculty.id == 1 or faculty.code.upper() == "CNTT" or "Công nghệ Thông tin" in faculty.name:
                print(f"BỎ QUA KHOA CNTT ({faculty.name})")
                continue

            subject_map = {}

            # 1. Thêm môn học
            for code, name, desc in data["subjects"]:
                existing_subj = (
                    await session.execute(
                        select(Subject).where(Subject.faculty_id == faculty.id, Subject.code == code)
                    )
                ).scalar_one_or_none()

                if not existing_subj:
                    new_subj = Subject(
                        faculty_id=faculty.id,
                        code=code,
                        name=name,
                        description=desc,
                    )
                    session.add(new_subj)
                    await session.flush()
                    subject_map[code] = new_subj
                    total_subjects_added += 1
                else:
                    subject_map[code] = existing_subj

            # 2. Thêm tài liệu công khai
            for title, subj_code, doc_type, year, ext in data["docs"]:
                subj = subject_map.get(subj_code)
                if not subj:
                    continue

                existing_doc = (
                    await session.execute(
                        select(Document).where(
                            Document.subject_id == subj.id,
                            Document.title == title,
                            Document.is_deleted == False,
                        )
                    )
                ).scalar_one_or_none()

                if existing_doc:
                    continue

                # Chọn user tương ứng khoa nếu có
                doc_owner = next((u for u in users if u.faculty_id == faculty.id), default_user)

                dummy_content = f"Nội dung tóm tắt học phần {subj.name} ({subj.code}). Tài liệu: {title}."
                file_uuid = uuid4().hex
                doc = Document(
                    owner_id=doc_owner.id,
                    workspace_id=None,
                    subject_id=subj.id,
                    is_public=True,
                    title=title,
                    description=f"{doc_type} môn {subj.name} ({subj.code}) - Khoa {faculty.name}",
                    file_path=f"storage/documents/seeds/{file_uuid}.{ext}",
                    thumbnail_path=None,
                    markdown_path=None,
                    file_type=ext,
                    file_size=1024 * 750,
                    checksum=checksum_str(f"{title}_{subj.code}_{file_uuid}"),
                    content=dummy_content,
                    metadata_={
                        "doc_type": doc_type,
                        "academic_year": year,
                    },
                )
                session.add(doc)
                await session.flush()

                # Tạo DocumentStats
                stats = DocumentStats(
                    document_id=doc.id,
                    view_count=15,
                    download_count=8,
                    save_count=3,
                    share_count=1,
                    trending_score=25.0,
                    last_activity_at=datetime.now(timezone.utc),
                )
                session.add(stats)

                # Tạo DocumentRating (4 hoặc 5 sao)
                rating = DocumentRating(
                    document_id=doc.id,
                    user_id=default_user.id,
                    stars=5,
                    comment="Tài liệu chất lượng cao, rất hữu ích cho kỳ thi!",
                )
                session.add(rating)
                total_docs_added += 1

        await session.commit()
        print(f"Hoàn thành! Đã thêm {total_subjects_added} môn học và {total_docs_added} tài liệu công khai cho các khoa khác.")


if __name__ == "__main__":
    asyncio.run(seed_other_faculties())
