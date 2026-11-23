# backend/tests/benchmark_accessed_within.py
"""
Benchmark read-only cho bộ lọc "Mở gần đây".

Chạy:
    cd backend
    .venv/bin/python tests/benchmark_accessed_within.py

Script chỉ dùng SELECT / EXPLAIN ANALYZE, không ghi dữ liệu.
So sánh:
  1. Không lọc thời gian (baseline)
  2. uploaded_within=today  -> lọc trực tiếp 1 cột trên bảng documents
     (tương đương tốc độ nếu thêm cột last_accessed_at)
  3. accessed_within=today / last_7_days -> lọc qua bảng download_logs
     (cách đang dùng)
  4. EXPLAIN ANALYZE + danh sách index của download_logs
"""

import asyncio
import statistics
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")

from sqlalchemy import func, select, text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.models.download_log import DownloadLog  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.document_query_service import DocumentQueryService  # noqa: E402

RUNS = 5
PAGE_SIZE = 20


async def timed(call, *, runs: int = RUNS) -> tuple[object, list[float]]:
    """Trả về kết quả lần cuối và danh sách thời gian (ms)."""
    samples: list[float] = []
    result = None
    for _ in range(runs):
        started = time.perf_counter()
        result = await call()
        samples.append((time.perf_counter() - started) * 1000)
    return result, samples


def fmt(samples: list[float]) -> str:
    return (
        f"min={min(samples):7.2f}ms | "
        f"median={statistics.median(samples):7.2f}ms | "
        f"avg={statistics.mean(samples):7.2f}ms | "
        f"max={max(samples):7.2f}ms"
    )


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)

    async with AsyncSession(engine) as db:
        # Chọn user có nhiều log nhất để benchmark có ý nghĩa.
        top_log = await db.execute(
            select(DownloadLog.user_id, func.count().label("cnt"))
            .group_by(DownloadLog.user_id)
            .order_by(func.count().desc())
            .limit(1)
        )
        row = top_log.first()
        if row is None:
            print("Không có download_logs trong DB để benchmark.")
            return

        user_id, log_count = row
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        username = user.username if user else f"#{user_id}"

        print("=" * 72)
        print("BENCHMARK accessed_within (READ-ONLY)")
        print("=" * 72)
        print(f"User: {username} (id={user_id}) | tổng log: {log_count}")
        print(f"Số lần chạy mỗi case: {RUNS} | page_size={PAGE_SIZE}")
        print()

        cases = [
            ("Không lọc thời gian (baseline)", {}),
            (
                "uploaded_within=today  [cột trên documents]",
                {"uploaded_within": "today"},
            ),
            (
                "accessed_within=today  [query download_logs]",
                {"accessed_within": "today"},
            ),
            (
                "accessed_within=last_7_days  [query download_logs]",
                {"accessed_within": "last_7_days"},
            ),
        ]

        for label, extra in cases:
            result, samples = await timed(
                lambda extra=extra: DocumentQueryService.query_documents(
                    db,
                    user_id,
                    scope="personal",
                    page=1,
                    page_size=PAGE_SIZE,
                    **extra,
                )
            )
            print(f"{label}")
            print(f"   total={result['total']} | items={len(result['items'])}")
            print(f"   {fmt(samples)}")
            print()

        # EXPLAIN ANALYZE cho truy vấn lõi.
        now = datetime.now(UTC)
        today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)

        explain_sql = text(
            """
            EXPLAIN ANALYZE
            SELECT d.id
            FROM documents d
            WHERE d.owner_id = :user_id
              AND d.workspace_id IS NULL
              AND d.is_deleted = false
              AND d.is_public = false
              AND d.bundle_parent_id IS NULL
              AND d.id IN (
                  SELECT dl.document_id
                  FROM download_logs dl
                  WHERE dl.user_id = :user_id
                    AND dl.action IN ('DOCUMENT_VIEWED', 'view')
                    AND dl.created_at >= :today_start
              )
            ORDER BY d.id DESC
            LIMIT :limit
            """
        )
        explain_res = await db.execute(
            explain_sql,
            {
                "user_id": user_id,
                "today_start": today_start,
                "limit": PAGE_SIZE + 1,
            },
        )
        print("EXPLAIN ANALYZE (truy vấn lõi accessed_within=today):")
        for line in explain_res.fetchall():
            print(f"   {line[0]}")
        print()

        indexes = await db.execute(
            text(
                """
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'download_logs'
                ORDER BY indexname
                """
            )
        )
        print("Index hiện có của download_logs:")
        for name, definition in indexes.fetchall():
            print(f"   - {name}: {definition}")

    await engine.dispose()
    print("=" * 72)


if __name__ == "__main__":
    asyncio.run(main())
