from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document


async def search_documents(db: AsyncSession, *, owner_id: int, query: str, limit: int = 20):
    sql = text(
        """
        SELECT *
        FROM documents
        WHERE owner_id = :owner_id
          AND (
            search_vector @@ websearch_to_tsquery('simple', :query)
            OR unaccent(lower(title)) LIKE unaccent(lower(:like_query))
            OR unaccent(lower(coalesce(description, ''))) LIKE unaccent(lower(:like_query))
          )
        ORDER BY updated_at DESC
        LIMIT :limit
        """
    )
    result = await db.execute(sql, {"owner_id": owner_id, "query": query, "like_query": f"%{query}%", "limit": limit})
    rows = result.mappings().all()
    return rows
