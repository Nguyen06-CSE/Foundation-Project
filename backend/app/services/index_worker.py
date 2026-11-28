"""Build citeable document chunks. Run from backend with ``python -m app.services.index_worker``."""
import argparse
import asyncio
import json
import logging
import time
import httpx
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.services import embedding_service
from app.services.chunking import collect

log = logging.getLogger(__name__)


async def schedule_model_change(document_id=None):
    """Queue a fresh run without replacing the currently served vector set."""
    model = embedding_service.model_key()
    if not model:
        return
    async with AsyncSessionLocal.begin() as db:
        await db.execute(text("""
            INSERT INTO document_index_runs(document_id,checksum,model)
            SELECT d.id,d.checksum,:model FROM documents d
            JOIN document_index_runs active ON active.document_id=d.id AND active.is_active
            WHERE NOT d.is_deleted AND NOT coalesce(d.is_bundle,false)
              AND active.model<>:model
              AND (CAST(:document_id AS integer) IS NULL OR d.id=:document_id)
              AND NOT EXISTS (SELECT 1 FROM document_index_runs queued
                WHERE queued.document_id=d.id AND queued.status IN ('pending','retry'))
            ON CONFLICT DO NOTHING
        """), {"model": model, "document_id": document_id})


async def step(document_id=None):
    async with AsyncSessionLocal.begin() as db:
        # A transaction owns one document run. A dead worker releases its lock;
        # incomplete batches roll back and may need another provider call.
        row = (await db.execute(text("""
            SELECT r.id,r.attempts,r.checksum,r.model,d.id AS document_id,d.file_path,d.content,d.markdown_path,d.file_type
            FROM document_index_runs r JOIN documents d ON d.id=r.document_id
            WHERE r.status IN ('pending','retry') AND r.next_attempt<=now()
              AND d.checksum=r.checksum AND NOT d.is_deleted
              AND (CAST(:document_id AS integer) IS NULL OR d.id=:document_id)
            ORDER BY r.next_attempt,r.id LIMIT 1 FOR UPDATE OF r SKIP LOCKED
        """), {"document_id": document_id})).mappings().first()
        if not row:
            return False
        params = {"id": row["id"]}
        started = time.monotonic()
        stage = "collect"
        attempt = row["attempts"] + 1
        log.info("run=%s document_id=%s stage=%s attempt=%s event=start", row["id"], row["document_id"], stage, attempt)
        try:
            async with db.begin_nested():
                model = embedding_service.model_key()
                if row["model"] != model:
                    await db.execute(
                        text("UPDATE document_index_runs SET model=:model WHERE id=:id"),
                        {"id": row["id"], "model": model},
                    )
                    await db.execute(
                        text("UPDATE document_chunks SET embedding=NULL WHERE run_id=:id"),
                        params,
                    )
                has_chunks = await db.scalar(text("SELECT EXISTS(SELECT FROM document_chunks WHERE run_id=:id)"),params)
                if not has_chunks:
                    chunks, coverage = await asyncio.to_thread(collect, row)
                    log.info("run=%s event=collected chunks=%s coverage=%s elapsed_s=%.3f", row["id"], len(chunks), coverage, time.monotonic()-started)
                    if chunks:
                        await db.execute(text("""
                            INSERT INTO document_chunks(run_id,ordinal,body,heading,source,location,search_vector)
                            VALUES(:id,:ordinal,:body,:heading,:source,cast(:location AS jsonb),
                              to_tsvector('simple',unaccent(:body)))
                        """), [dict(c,id=row["id"],ordinal=i,location=json.dumps(c["location"]))
                               for i,c in enumerate(chunks)])
                    await db.execute(text("UPDATE document_index_runs SET coverage=cast(:coverage AS jsonb) WHERE id=:id"),
                                     dict(params,coverage=json.dumps(coverage)))
                if model:
                    pending = (await db.execute(text("""
                        SELECT id,body FROM document_chunks
                        WHERE run_id=:id AND embedding IS NULL ORDER BY ordinal
                    """), params)).mappings().all()
                    batch_size = max(1, settings.EMBEDDING_BATCH_SIZE)
                    for start in range(0, len(pending), batch_size):
                        batch = pending[start:start + batch_size]
                        stage = "embedding"
                        batch_started = time.monotonic()
                        log.info("run=%s event=embedding_start batch=%s count=%s", row["id"], start // batch_size + 1, len(batch))
                        vectors = await embedding_service.embed([item["body"] for item in batch])
                        log.info("run=%s event=embedding_done batch=%s elapsed_s=%.3f", row["id"], start // batch_size + 1, time.monotonic()-batch_started)
                        await db.execute(text("""
                            UPDATE document_chunks SET embedding=CAST(:embedding AS vector)
                            WHERE id=:chunk_id AND run_id=:id
                        """), [
                            {"id": row["id"], "chunk_id": item["id"], "embedding": json.dumps(vector)}
                            for item, vector in zip(batch, vectors)
                        ])
                stage = "publish"
                published = await db.scalar(text("""
                    WITH candidate AS (
                      SELECT r.document_id FROM document_index_runs r JOIN documents d ON d.id=r.document_id
                      WHERE r.id=:id AND r.status IN ('pending','retry')
                        AND d.checksum=r.checksum AND NOT d.is_deleted
                    ), deactivated AS (
                      UPDATE document_index_runs SET is_active=false,status='obsolete'
                      WHERE is_active AND document_id=(SELECT document_id FROM candidate) AND id<>:id
                    )
                    UPDATE document_index_runs r SET is_active=true,attempts=0,last_error=NULL,
                      status=CASE WHEN EXISTS(SELECT FROM document_chunks WHERE run_id=:id)
                      THEN 'ready' ELSE 'empty' END
                    WHERE r.id=:id AND EXISTS (SELECT 1 FROM candidate)
                    RETURNING r.document_id
                """), params)
                if published is None:
                    await db.execute(text("""UPDATE document_index_runs
                        SET is_active=false,status='obsolete' WHERE id=:id"""), params)
                log.info("run=%s event=prepared outcome=%s elapsed_s=%.3f commit=pending", row["id"], "ready_or_empty" if published is not None else "obsolete", time.monotonic()-started)
        except Exception as exc:
            http_status = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
            outcome = "failed" if attempt >= settings.INDEX_MAX_RETRIES else "retry"
            log.warning("run=%s document_id=%s stage=%s attempt=%s outcome=%s error=%s http_status=%s elapsed_s=%.3f", row["id"], row["document_id"], stage, attempt, outcome, type(exc).__name__, http_status, time.monotonic()-started)
            await db.execute(text("""UPDATE document_index_runs SET status=CASE WHEN attempts+1 >= :max_retries THEN 'failed' ELSE 'retry' END,
                attempts=attempts+1,
                next_attempt=now()+make_interval(secs=>least(900,5*(1<<least(attempts,7)))),
                last_error=:error WHERE id=:id"""),dict(params,error=type(exc).__name__,max_retries=settings.INDEX_MAX_RETRIES))
    log.info("run=%s event=committed elapsed_s=%.3f", row["id"], time.monotonic()-started)
    return True


async def run(once, document_id=None):
    await schedule_model_change(document_id)
    log.info("event=worker_started document_id=%s once=%s", document_id, once)
    while True:
        if not await step(document_id):
            if once:
                log.info("event=no_available_work document_id=%s", document_id)
                return
            await asyncio.sleep(2)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Drain currently available work")
    parser.add_argument("--document-id", type=int, help="Only process this document; respects locks and retry delay")
    args = parser.parse_args()
    asyncio.run(run(args.once, args.document_id))
