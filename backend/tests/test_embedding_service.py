"""Contract tests for the OpenAI-compatible embedding provider."""

from types import SimpleNamespace

import httpx
import pytest

from app.services import embedding_service


def _request() -> httpx.Request:
    return httpx.Request("POST", "https://provider.example/v1/embeddings")


class FakeResponse:
    def __init__(self, status=200, data=None, headers=None):
        self.status_code = status
        self.data = data or []
        self.headers = headers or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                "provider error",
                request=_request(),
                response=httpx.Response(
                    self.status_code,
                    headers=self.headers,
                    request=_request(),
                ),
            )

    def json(self):
        return {"data": self.data}


def _response(status=200, data=None, headers=None) -> FakeResponse:
    return FakeResponse(status, data, headers)


class FakeAsyncClient:
    def __init__(self, outcomes, calls):
        self.outcomes = list(outcomes)
        self.calls = calls

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, headers=None, json=None):
        self.calls.append({"url": url, "headers": headers, "json": json})
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


@pytest.fixture()
def provider(monkeypatch):
    fake = SimpleNamespace(
        EMBEDDING_BASE_URL="https://provider.example/v1/",
        EMBEDDING_MODEL="embed-v1",
        EMBEDDING_DIMENSIONS=2,
        EMBEDDING_API_KEY="secret",
    )
    monkeypatch.setattr(embedding_service, "settings", fake)
    return fake


@pytest.fixture()
def http(monkeypatch):
    calls = []

    def install(outcomes):
        monkeypatch.setattr(
            embedding_service.httpx,
            "AsyncClient",
            lambda **kwargs: FakeAsyncClient(outcomes, calls),
        )

    return SimpleNamespace(calls=calls, install=install)


def test_model_key_normalizes_base_url_and_includes_dimensions(provider):
    assert embedding_service.model_key() == "https://provider.example/v1|embed-v1|2"


def test_model_key_is_empty_without_provider(provider):
    provider.EMBEDDING_MODEL = ""

    assert embedding_service.model_key() == ""

    provider.EMBEDDING_MODEL = "embed-v1"
    provider.EMBEDDING_DIMENSIONS = 0
    assert embedding_service.model_key() == ""


@pytest.mark.asyncio
async def test_embed_returns_empty_without_calling_provider(provider, http):
    http.install([])

    assert await embedding_service.embed([]) == []
    assert http.calls == []


@pytest.mark.asyncio
async def test_embed_requires_provider_and_dimensions(provider):
    provider.EMBEDDING_BASE_URL = ""

    with pytest.raises(ValueError, match="Chưa cấu hình"):
        await embedding_service.embed(["hello"])


@pytest.mark.asyncio
async def test_embed_sends_bearer_auth_and_sorts_indexed_rows(provider, http):
    http.install([
        _response(data=[
            {"index": 1, "embedding": [0.3, 0.4]},
            {"index": 0, "embedding": [0.1, 0.2]},
        ])
    ])

    vectors = await embedding_service.embed(["first", "second"])

    assert vectors == [[0.1, 0.2], [0.3, 0.4]]
    assert http.calls == [{
        "url": "https://provider.example/v1/embeddings",
        "headers": {"Authorization": "Bearer secret"},
        "json": {"model": "embed-v1", "input": ["first", "second"]},
    }]


@pytest.mark.asyncio
async def test_embed_omits_auth_header_when_key_is_empty(provider, http):
    provider.EMBEDDING_API_KEY = ""
    http.install([_response(data=[{"embedding": [0.1, 0.2]}])])

    await embedding_service.embed(["hello"])

    assert http.calls[0]["headers"] == {}


@pytest.mark.asyncio
async def test_embed_retries_rate_limit_after_retry_after(provider, http, monkeypatch):
    sleeps = []

    async def fake_sleep(seconds):
        sleeps.append(seconds)

    monkeypatch.setattr(embedding_service, "asyncio", SimpleNamespace(sleep=fake_sleep))
    http.install([
        _response(429, headers={"Retry-After": "3"}),
        _response(data=[{"embedding": [0.1, 0.2]}]),
    ])

    assert await embedding_service.embed(["hello"]) == [[0.1, 0.2]]
    assert sleeps == [3.0]
    assert len(http.calls) == 2


@pytest.mark.asyncio
async def test_embed_retries_connection_errors(provider, http, monkeypatch):
    sleeps = []

    async def fake_sleep(seconds):
        sleeps.append(seconds)

    monkeypatch.setattr(embedding_service, "asyncio", SimpleNamespace(sleep=fake_sleep))
    http.install([
        httpx.ConnectError("down", request=_request()),
        _response(data=[{"embedding": [0.1, 0.2]}]),
    ])

    assert await embedding_service.embed(["hello"]) == [[0.1, 0.2]]
    assert sleeps == [1]


@pytest.mark.asyncio
async def test_embed_does_not_retry_client_errors(provider, http):
    http.install([_response(400)])

    with pytest.raises(httpx.HTTPStatusError):
        await embedding_service.embed(["hello"])

    assert len(http.calls) == 1


@pytest.mark.asyncio
async def test_embed_rejects_wrong_row_count(provider, http):
    http.install([_response(data=[{"embedding": [0.1, 0.2]}])])

    with pytest.raises(ValueError, match="sai số lượng embedding"):
        await embedding_service.embed(["one", "two"])


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "vector",
    [
        [0.1],
        [float("nan"), 0.2],
        [float("inf"), 0.2],
        [0, 0],
    ],
)
async def test_embed_rejects_invalid_vectors(provider, http, vector):
    http.install([_response(data=[{"embedding": vector}])])

    with pytest.raises(ValueError, match="Vector embedding không hợp lệ"):
        await embedding_service.embed(["hello"])
