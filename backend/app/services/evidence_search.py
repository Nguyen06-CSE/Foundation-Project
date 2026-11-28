"""PostgreSQL evidence retrieval for personal and group libraries."""
import json
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from sqlalchemy import text
from app.core.config import settings

from app.services import embedding_service
from app.services.search_service import extract_snippet
from app.services.evidence_text import answer, build_summary_text, normalized, summarize, terms


# Resolve access inside the same statement that reads content. A revoked membership
# cannot authorize a subsequent citation request, including a cached summary.
_VISIBLE = """
  SELECT d.id, d.title, d.content, d.workspace_id, d.checksum, d.search_vector
  FROM documents d
  WHERE NOT d.is_deleted AND NOT coalesce(d.is_public,false) AND (
    (d.workspace_id IS NULL AND d.owner_id=:uid)
    OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id=d.workspace_id
      AND w.type='group' AND NOT w.is_deleted AND (w.owner_id=:uid OR EXISTS (
        SELECT 1 FROM workspace_members m WHERE m.workspace_id=w.id AND m.user_id=:uid))))
"""
_ACTIVE = """JOIN document_index_runs r ON r.document_id=d.id AND r.is_active AND r.checksum=d.checksum"""
_FIELDS = """c.id AS chunk_id, d.id AS document_id, d.workspace_id, r.id AS run_id, c.body AS text, c.heading, c.source, c.location"""
_FIELDS_LIST = ("chunk_id", "document_id", "run_id", "text", "heading", "source", "location")


def cite(row):
    citation = {field: row[field] for field in _FIELDS_LIST}
    citation["url"] = url(row, row["chunk_id"])
    return citation


def url(row, chunk_id, query=None):
    base = f"/groups/{row['workspace_id']}/documents" if row["workspace_id"] else "/personal/documents"
    args = {"tab": "content"}
    if chunk_id:
        args["chunk"] = chunk_id
    if query:
        args["q"] = query
    return f"{base}/{row.get('id') or row['document_id']}?{urlencode(args)}"


async def vectors(inputs):
    try:
        return await embedding_service.embed(inputs)
    except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError):
        return []


async def run_info(db, uid, doc_id):
    result = await db.execute(text(f"""
        WITH visible AS ({_VISIBLE})
        SELECT d.id, d.workspace_id, active.id AS run_id, active.summary,
               coalesce(active.coverage, latest.coverage) AS coverage,
               coalesce(active.status, latest.status, 'pending') AS status
        FROM visible d LEFT JOIN LATERAL (
           SELECT * FROM document_index_runs WHERE document_id=d.id
             AND checksum=d.checksum AND is_active LIMIT 1
        ) active ON true LEFT JOIN LATERAL (
           SELECT coverage,status FROM document_index_runs WHERE document_id=d.id
             AND checksum=d.checksum ORDER BY id DESC LIMIT 1
        ) latest ON true WHERE d.id=:doc
    """), {"uid": uid, "doc": doc_id})
    info = result.mappings().first()
    if not info:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    return info


async def chunks(db, uid, doc_id, chunk_id=None):
    condition = "AND c.id=:chunk" if chunk_id is not None else ""
    rows = await db.execute(text(f"""
        WITH visible AS ({_VISIBLE})
        SELECT {_FIELDS} FROM visible d {_ACTIVE}
        JOIN document_chunks c ON c.run_id=r.id
        WHERE d.id=:doc {condition} ORDER BY c.ordinal
    """), {"uid": uid, "doc": doc_id, "chunk": chunk_id})
    return [cite(row) for row in rows.mappings()]


async def search(db, uid, query, page, page_size, match_fields=None):
    fields = set(match_fields if match_fields is not None else ("title", "content", "semantic"))
    embedding = await vectors([query]) if "semantic" in fields else []
    # Keep exact lexical hits, bound semantic candidates at 100 distinct documents.
    # Rank a document once per retrieval method to avoid favoring longer textbooks.
    semantic = """
       SELECT document_id, chunk_id, row_number() OVER (ORDER BY distance,document_id) AS rank
       FROM (SELECT DISTINCT ON (document_id) document_id,chunk_id, distance
             FROM (SELECT d.id AS document_id,c.id AS chunk_id,
                          c.embedding <=> CAST(:vec AS vector) AS distance
                   FROM visible d JOIN document_index_runs r ON r.document_id=d.id
                      AND r.checksum=d.checksum AND r.is_active AND r.model=:model
                   JOIN document_chunks c ON c.run_id=r.id
                   WHERE c.embedding IS NOT NULL) distances
             WHERE distance <= 1-CAST(:min_similarity AS double precision)
             ORDER BY document_id,distance,chunk_id) best
       ORDER BY distance,document_id LIMIT 100
    """ if embedding else "SELECT NULL::integer document_id,NULL::bigint chunk_id,NULL::bigint rank WHERE false"
    rows = await db.execute(text(f"""
        WITH visible AS ({_VISIBLE}), q AS (SELECT websearch_to_tsquery('simple',unaccent(:q)) AS ts),
        title_hits AS (
          SELECT d.id AS document_id, row_number() OVER (
            ORDER BY ts_rank(to_tsvector('simple',unaccent(coalesce(d.title,''))),q.ts) DESC,d.id) AS rank
          FROM visible d,q WHERE :title_enabled
            AND to_tsvector('simple',unaccent(coalesce(d.title,''))) @@ q.ts
        ), lexical_hits AS (
          SELECT d.id AS document_id,NULL::bigint AS chunk_id,
                 ts_rank(to_tsvector('simple',unaccent(coalesce(d.content,''))),q.ts) AS score
          FROM visible d,q WHERE :content_enabled
            AND to_tsvector('simple',unaccent(coalesce(d.content,''))) @@ q.ts
          UNION ALL
          SELECT d.id,c.id,ts_rank(c.search_vector,q.ts)
          FROM visible d {_ACTIVE} JOIN document_chunks c ON c.run_id=r.id CROSS JOIN q
          WHERE :content_enabled AND c.search_vector @@ q.ts
        ), lexical AS (
          SELECT document_id,chunk_id,row_number() OVER (ORDER BY score DESC,document_id) AS rank
          FROM (SELECT DISTINCT ON(document_id) document_id,
                   first_value(chunk_id) OVER (PARTITION BY document_id ORDER BY (chunk_id IS NULL),score DESC,chunk_id) AS chunk_id,
                   max(score) OVER (PARTITION BY document_id) score FROM lexical_hits) best
        ), semantic AS ({semantic}), content_semantic AS (
          SELECT coalesce(l.document_id,s.document_id) AS document_id,
                 coalesce(l.chunk_id,s.chunk_id) AS chunk_id, l.rank AS content_rank,s.rank AS semantic_rank
          FROM lexical l FULL JOIN semantic s USING(document_id)
        ), fused AS (
          SELECT coalesce(t.document_id,b.document_id) AS id,b.chunk_id,
                 t.rank AS title_rank,b.content_rank,b.semantic_rank,
                 coalesce(1.0/(60+t.rank),0)+coalesce(1.0/(60+b.content_rank),0)
                   +coalesce(1.0/(60+b.semantic_rank),0) AS score
          FROM title_hits t FULL JOIN content_semantic b USING(document_id)
        ), page AS (SELECT * FROM fused ORDER BY score DESC,id LIMIT :size OFFSET :offset)
        SELECT totals.total, p.id, d.title, d.workspace_id, c.id AS chunk_id, d.id AS document_id,
               c.run_id,coalesce(c.body,d.content) AS text,c.heading,c.source,c.location,
               p.title_rank,p.content_rank,p.semantic_rank,p.score
        FROM (SELECT count(*) AS total FROM fused) totals LEFT JOIN page p ON true
        LEFT JOIN visible d ON d.id=p.id LEFT JOIN document_chunks c ON c.id=p.chunk_id
        ORDER BY p.score DESC,p.id
    """), {"uid": uid, "q": query, "size": page_size, "offset": (page-1)*page_size,
           "vec": json.dumps(embedding[0]) if embedding else None, "model": embedding_service.model_key(),
           "title_enabled": "title" in fields, "content_enabled": "content" in fields,
           "min_similarity": settings.SEMANTIC_MIN_SIMILARITY})
    data = rows.mappings().all()
    items = []
    for row in data:
        if row["id"] is None:
            continue
        workspace = row["workspace_id"]
        items.append({"id": row["id"], "title": row["title"],
                      "type": "group_doc" if workspace else "personal_doc",
                      "subtitle": f"Tài liệu • Nhóm #{workspace}" if workspace else "Tài liệu • Kho cá nhân",
                      "url": url(row,row["chunk_id"],query), "snippet": extract_snippet(row["text"],query),
                      "citation": cite(row) if row["chunk_id"] else None,
                      "match": {"methods": [method for field, method in (
                          ("title", "lexical_title"), ("content", "lexical_content"), ("semantic", "semantic"))
                          if row.get(field + "_rank") is not None],
                          "title_rank": row.get("title_rank"), "content_rank": row.get("content_rank"),
                          "semantic_rank": row.get("semantic_rank"),
                          "fused_score": float(row["score"]) if row.get("score") is not None else None}})
    unavailable = ["semantic"] if "semantic" in fields and not embedding else []
    return {"items": items, "total": data[0]["total"], "page": page, "page_size": page_size,
            "fallback": bool(unavailable), "unavailable_match_fields": unavailable}


async def question(db, uid, doc_id, query):
    info = await run_info(db, uid, doc_id)
    if not info["run_id"]:
        return {"status": "not_ready", "answer": None, "citations": [], "index_status": info["status"]}
    embedding = await vectors([query])
    semantic = """CASE WHEN r.model=:model AND c.embedding IS NOT NULL
                  THEN 1-(c.embedding <=> CAST(:vec AS vector)) ELSE 0 END""" if embedding else "0"
    result = await db.execute(text(f"""
        WITH visible AS ({_VISIBLE})
        SELECT {_FIELDS} FROM visible d {_ACTIVE} JOIN document_chunks c ON c.run_id=r.id
        WHERE d.id=:doc ORDER BY ({semantic}) + ts_rank(c.search_vector,
         plainto_tsquery('simple',unaccent(:q))) DESC, c.ordinal LIMIT 32
    """), {"uid": uid,"doc": doc_id,"q": query,"model": embedding_service.model_key(),
           "vec": json.dumps(embedding[0]) if embedding else None})
    evidence = [cite(row) for row in result.mappings()]
    return answer(query, evidence)


async def summary(db, uid, doc_id):
    info = await run_info(db, uid, doc_id)
    if info["summary"] is not None:
        items = info["summary"]
        return {"text": build_summary_text(items), "items": items, "coverage": info["coverage"] or {}}
    evidence = await chunks(db, uid, doc_id)
    items = summarize(evidence)
    if evidence:
        run_id = evidence[0]["run_id"]
        stored = await db.execute(text(f"""
            WITH visible AS ({_VISIBLE}) UPDATE document_index_runs r SET summary=CAST(:items AS jsonb)
            FROM visible d WHERE r.id=:run AND r.is_active AND r.document_id=d.id AND r.checksum=d.checksum
            RETURNING r.coverage
        """), {"uid": uid,"run":run_id,"items":json.dumps(items,ensure_ascii=False)})
        coverage = stored.scalar_one_or_none()
        if coverage is None:
            raise HTTPException(409, "Tài liệu vừa được cập nhật")
        await db.commit()
        return {"text": build_summary_text(items), "items": items, "coverage": coverage}
    return {"text": "", "items": [], "coverage": info["coverage"] or {}}


async def tag_suggestions(db, uid, doc_id):
    info = await run_info(db, uid, doc_id)
    evidence = await chunks(db, uid, doc_id)
    if not evidence:
        return {"existing": [], "new": []}
    available = await db.execute(text("""
        SELECT t.id,t.name,dt.document_id IS NOT NULL AS attached FROM tags t
        LEFT JOIN document_tags dt ON dt.tag_id=t.id AND dt.document_id=:doc
        WHERE (CAST(:ws AS integer) IS NULL AND t.owner_id=:uid AND t.workspace_id IS NULL)
           OR (CAST(:ws AS integer) IS NOT NULL AND (
               t.workspace_id=CAST(:ws AS integer) OR EXISTS (
                   SELECT 1 FROM workspace_tags wt
                   WHERE wt.workspace_id=CAST(:ws AS integer) AND wt.tag_id=t.id)))
        ORDER BY t.name,t.id
    """), {"uid": uid, "ws": info["workspace_id"], "doc": doc_id})
    existing = []
    tags = available.mappings().all()
    known = {normalized(tag["name"]) for tag in tags}
    for tag in tags:
        if tag["attached"]:
            continue
        needle = normalized(tag["name"])
        match = next((c for c in evidence if needle and needle in normalized((c["heading"] or "") + " " + c["text"])), None)
        if match:
            existing.append({"tag_id": tag["id"], "name": tag["name"], "citation": match})
    # Headings are grounded candidates; skip generic labels and aliases already in this library.
    proposed = []
    seen = set(known)
    generic = {"giới thiệu", "tổng quan", "mục lục", "nội dung", "kết luận", "introduction", "overview", "contents"}
    for chunk in evidence:
        name = (chunk["heading"] or "").strip().lstrip("#").strip()
        key = normalized(name)
        if not 4 <= len(name) <= 64 or key in seen or key in generic or len(key.split()) > 6:
            continue
        seen.add(key)
        proposed.append({"tag_id": None, "name": name, "citation": chunk})
        if len(proposed) == 5:
            break
    return {"existing": existing[:5], "new": proposed}


async def related(db, uid, doc_id):
    await run_info(db, uid, doc_id)
    sources = await chunks(db, uid, doc_id)
    if not sources:
        return {"items": []}
    source = next((c for c in sources if c["heading"] and len(c["heading"].split()) >= 2), None)
    heading = source["heading"] if source else ""
    if not heading:
        return {"items": []}
    result = await db.execute(text(f"""
        WITH visible AS ({_VISIBLE}), q AS (SELECT plainto_tsquery('simple',unaccent(:heading)) AS ts)
        SELECT * FROM (
          SELECT DISTINCT ON (d.id) d.id,d.title,d.workspace_id,c.id AS chunk_id,c.body AS text,
                 c.heading,c.source,c.location,r.id AS run_id,
                 ts_rank(c.search_vector,q.ts) AS relevance
          FROM visible d {_ACTIVE} JOIN document_chunks c ON c.run_id=r.id CROSS JOIN q
          WHERE d.id<>:doc AND d.checksum<>(SELECT checksum FROM documents WHERE id=:doc)
            AND c.search_vector @@ q.ts
          ORDER BY d.id,relevance DESC,c.id
        ) candidates ORDER BY relevance DESC,id LIMIT 5
    """), {"uid": uid, "doc": doc_id, "heading": heading})
    items = []
    for row in result.mappings():
        target = cite({**row, "document_id": row["id"]})
        items.append({"document_id": row["id"], "title": row["title"],
                      "url": url(row,row["chunk_id"]), "source": source, "target": target})
    return {"items": items}
