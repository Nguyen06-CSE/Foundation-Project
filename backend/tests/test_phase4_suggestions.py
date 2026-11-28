from unittest.mock import AsyncMock

import pytest

from app.services import evidence_search


class Rows:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return self.rows


@pytest.mark.asyncio
async def test_tag_suggestions_exclude_attached_and_propose_grounded_heading(monkeypatch):
    citation = {"heading": "Cây tìm kiếm nhị phân", "text": "Nút bên phải có giá trị lớn hơn nút gốc.", "chunk_id": 1}
    monkeypatch.setattr(evidence_search, "run_info", AsyncMock(return_value={"workspace_id": 7}))
    monkeypatch.setattr(evidence_search, "chunks", AsyncMock(return_value=[citation]))
    db = AsyncMock()
    db.execute.return_value = Rows([
        {"id": 3, "name": "Cây tìm kiếm", "attached": True},
        {"id": 4, "name": "Nhị phân", "attached": False},
    ])

    result = await evidence_search.tag_suggestions(db, 2, 10)

    assert [item["tag_id"] for item in result["existing"]] == [4]
    assert result["new"] == [{"tag_id": None, "name": "Cây tìm kiếm nhị phân", "citation": citation}]
    sql, params = db.execute.call_args.args
    assert "CAST(:ws AS integer)" in str(sql)
    assert "FROM workspace_tags wt" in str(sql)
    assert params == {"uid": 2, "ws": 7, "doc": 10}
