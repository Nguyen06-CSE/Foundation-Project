from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document


async def search_documents(
    db: AsyncSession, 
    *, 
    owner_id: int, 
    workspace_id: int | None = None, # Thêm tham số này để khớp với routers/search.py
    query: str, 
    limit: int = 20
):
    # Xác định phạm vi tìm kiếm: Cá nhân hay Workspace
    workspace_filter = "workspace_id = :workspace_id" if workspace_id else "owner_id = :owner_id AND workspace_id IS NULL"

    sql = text(
        f"""
        SELECT *
        FROM documents
        WHERE is_deleted = false AND ({workspace_filter})
          AND (
            search_vector @@ websearch_to_tsquery('simple', :query)
            OR unaccent(lower(title)) LIKE unaccent(lower(:like_query))
            OR unaccent(lower(coalesce(description, ''))) LIKE unaccent(lower(:like_query))
          )
        ORDER BY updated_at DESC
        LIMIT :limit
        """
    )
    
    result = await db.execute(
        sql, 
        {
            "owner_id": owner_id, 
            "workspace_id": workspace_id,
            "query": query, 
            "like_query": f"%{query}%", 
            "limit": limit
        }
    )
    rows = result.mappings().all()
    return rows