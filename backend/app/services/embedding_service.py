"""OpenAI-compatible embedding transport shared by worker and retrieval."""
import asyncio
import math
import httpx
from app.core.config import settings


def model_key() -> str:
    if not settings.EMBEDDING_MODEL or not settings.EMBEDDING_BASE_URL or settings.EMBEDDING_DIMENSIONS < 1:
        return ""
    return f"{settings.EMBEDDING_BASE_URL.rstrip('/')}|{settings.EMBEDDING_MODEL}|{settings.EMBEDDING_DIMENSIONS}"


async def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if not model_key():
        raise ValueError("Chưa cấu hình API embedding và số chiều")
    headers = {}
    if settings.EMBEDDING_API_KEY:
        headers["Authorization"] = f"Bearer {settings.EMBEDDING_API_KEY}"
    async with httpx.AsyncClient(timeout=45) as client:
        for attempt in range(3):
            try:
                response = await client.post(
                    settings.EMBEDDING_BASE_URL.rstrip("/") + "/embeddings",
                    headers=headers,
                    json={"model": settings.EMBEDDING_MODEL, "input": texts},
                )
                response.raise_for_status()
                break
            except (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError):
                if attempt == 2:
                    raise
                await asyncio.sleep(2**attempt)
            except httpx.HTTPStatusError as exc:
                if attempt == 2 or exc.response.status_code not in {429, 500, 502, 503, 504}:
                    raise
                retry_after = exc.response.headers.get("Retry-After", "")
                await asyncio.sleep(float(retry_after) if retry_after.isdigit() else 2**attempt)
    rows = response.json()["data"]
    if rows and all("index" in row for row in rows):
        rows = sorted(rows, key=lambda item: item["index"])
    if len(rows) != len(texts):
        raise ValueError("API trả sai số lượng embedding")
    vectors = [row["embedding"] for row in rows]
    if any(len(v) != settings.EMBEDDING_DIMENSIONS or not all(math.isfinite(n) for n in v)
           or not any(v) for v in vectors):
        raise ValueError("Vector embedding không hợp lệ")
    return vectors
