import pytest
from app.core.database import AsyncSessionLocal
from app.routers.library import get_faculties, get_subjects_by_faculty


@pytest.mark.asyncio
async def test_library_document_counts():
    """Kiểm tra document_count của khoa và từng môn học đếm chính xác số lượng tài liệu thực tế."""
    async with AsyncSessionLocal() as session:
        # 1. Kiểm tra Khoa CNTT có ít nhất 5 tài liệu công khai (không bị kẹt ở mức 1)
        faculties = await get_faculties(session)
        cntt = next((f for f in faculties if f.id == 1 or "Công nghệ" in f.name), None)
        assert cntt is not None, "Khoa CNTT phải tồn tại"
        assert cntt.document_count >= 5, f"Kỳ vọng ít nhất 5 tài liệu nhưng thực tế là {cntt.document_count}"

        # 2. Kiểm tra chi tiết từng môn trong khoa CNTT
        subjects = await get_subjects_by_faculty(cntt.id, session)
        ktmt = next((s for s in subjects if s.id == 4 or "Kiến trúc máy tính" in s.name), None)
        assert ktmt is not None, "Môn Kiến trúc máy tính phải tồn tại"
        assert ktmt.document_count == 3, f"Kỳ vọng KTMT có 3 tài liệu nhưng thực tế là {ktmt.document_count}"

        ctdl = next((s for s in subjects if s.id == 2 or "Cấu trúc dữ liệu" in s.name), None)
        assert ctdl is not None, "Môn CTDL phải tồn tại"
        assert ctdl.document_count == 1, f"Kỳ vọng CTDL có 1 tài liệu nhưng thực tế là {ctdl.document_count}"

        desktop = next((s for s in subjects if s.id == 19 or "Desktop" in s.name), None)
        assert desktop is not None, "Môn Desktop phải tồn tại"
        assert desktop.document_count == 1, f"Kỳ vọng Desktop có 1 tài liệu nhưng thực tế là {desktop.document_count}"
