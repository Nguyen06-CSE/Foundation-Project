import asyncio
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.main import app
from app.services.search_service import search_documents


@pytest.fixture(scope="module")
def database_url():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Cần TEST_DATABASE_URL trỏ tới PostgreSQL local/disposable có Alembic head.")
    return url


def _engine(url):
    return create_async_engine(
        url,
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    )


async def _seed(url):
    suffix = uuid.uuid4().hex[:10]
    engine = _engine(url)
    try:
        async with engine.begin() as conn:
            user_id = await conn.scalar(
                text(
                    "INSERT INTO users (username, email, password_hash, full_name, role) "
                    "VALUES (:username, :email, 'x', 'Search Test', 'student') RETURNING id"
                ),
                {"username": f"fts_{suffix}", "email": f"fts_{suffix}@example.test"},
            )
            doc_id = await conn.scalar(
                text(
                    "INSERT INTO documents (owner_id, title, content, file_path, checksum, is_public) "
                    "VALUES (:user_id, 'Kiến trúc máy tính', 'Nội dung cấu trúc dữ liệu', "
                    "'/tmp/fts-test.pdf', :checksum, false) RETURNING id"
                ),
                {"user_id": user_id, "checksum": f"fts-{suffix}"},
            )
            fts_ok = await conn.scalar(
                text(
                    "SELECT search_vector @@ websearch_to_tsquery('simple', unaccent(:q)) "
                    "FROM documents WHERE id = :id"
                ),
                {"q": "kien truc", "id": doc_id},
            )

        # search_documents() dùng connection riêng: phải commit seed trước khi query.
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            rows = await search_documents(
                session, owner_id=user_id, query="kien truc", limit=10
            )
        return user_id, doc_id, bool(fts_ok), [row["id"] for row in rows]
    finally:
        await engine.dispose()


async def _cleanup(url, user_id, doc_id):
    engine = _engine(url)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("DELETE FROM documents WHERE id = :id"), {"id": doc_id})
            await conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
    finally:
        await engine.dispose()


def test_search_endpoint_and_unaccent_real_db(database_url):
    """GET /search/ phải chạy được và tìm được tài liệu tiếng Việt không dấu."""
    user_id, doc_id, fts_ok, service_ids = asyncio.run(_seed(database_url))
    engine = _engine(database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    try:
        assert fts_ok, "search_vector phải khớp query không dấu 'kien truc'"
        assert doc_id in service_ids, "search_documents() phải trả về tài liệu đã seed"

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = lambda: type(
            "CurrentUser", (), {"id": user_id}
        )()
        with TestClient(app) as client:
            response = client.get("/search/", params={"q": "kien truc"})
        assert response.status_code == 200
        assert any(item["id"] == doc_id for item in response.json())
    finally:
        app.dependency_overrides.clear()
        asyncio.run(engine.dispose())
        asyncio.run(_cleanup(database_url, user_id, doc_id))
