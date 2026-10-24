import pytest
from unittest.mock import MagicMock
from app.services.file_service import remove_file_if_unreferenced


@pytest.mark.asyncio
async def test_remove_file_if_unreferenced(monkeypatch):
    mock_db = MagicMock()
    mock_safe_remove = MagicMock()
    monkeypatch.setattr("app.services.file_service.safe_remove", mock_safe_remove)

    # Trường hợp 1: Còn bản ghi khác tham chiếu (count = 1) -> Không xóa vật lý
    class FakeResultReferenced:
        def scalar(self):
            return 1

    async def fake_execute_ref(*args, **kwargs):
        return FakeResultReferenced()

    mock_db.execute = fake_execute_ref
    await remove_file_if_unreferenced(mock_db, "storage/6/test.pdf", exclude_doc_ids={1})
    assert mock_safe_remove.call_count == 0

    # Trường hợp 2: Không còn ai tham chiếu (count = 0) -> Xóa vật lý
    class FakeResultUnreferenced:
        def scalar(self):
            return 0

    async def fake_execute_unref(*args, **kwargs):
        return FakeResultUnreferenced()

    mock_db.execute = fake_execute_unref
    await remove_file_if_unreferenced(mock_db, "storage/6/test.pdf", exclude_doc_ids={1})
    assert mock_safe_remove.call_count == 1
    mock_safe_remove.assert_called_once_with("storage/6/test.pdf")
