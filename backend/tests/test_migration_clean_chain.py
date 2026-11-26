"""Kiểm tra chuỗi Alembic có thể dựng schema từ database hoàn toàn trống."""

import os
import subprocess
from urllib.parse import unquote, urlparse

import psycopg2
import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory


BRIDGE = "c9d0e1f2a3b4"
BASE = "dae4972dff87"
F844 = "f844331e6c1e"
HEAD = "b3c4d5e6f7a8"


def _script() -> ScriptDirectory:
    return ScriptDirectory.from_config(Config("alembic.ini"))


def test_bridge_inserted_between_init_and_f844():
    """Bridge phải nằm ngay sau init và trước f844; head vẫn là một điểm duy nhất."""
    script = _script()
    assert script.get_heads() == [HEAD]
    assert script.get_revision(BRIDGE).down_revision == BASE
    assert script.get_revision(F844).down_revision == BRIDGE

    chain = [rev.revision for rev in script.walk_revisions(BASE, HEAD)]
    assert chain.index(F844) + 1 == chain.index(BRIDGE)
    assert chain.index(BRIDGE) + 1 == chain.index(BASE)


@pytest.mark.skipif(
    not os.environ.get("CLEAN_CHAIN_DATABASE_URL"),
    reason="Cần CLEAN_CHAIN_DATABASE_URL trỏ tới PostgreSQL disposable, đang bỏ qua.",
)
def test_clean_chain_upgrade_from_empty_database():
    """Chạy toàn bộ chain trên DB disposable trống rồi kiểm tra objects cốt lõi."""
    parsed = urlparse(os.environ["CLEAN_CHAIN_DATABASE_URL"].replace("+asyncpg", ""))
    dsn = {
        "dbname": parsed.path.lstrip("/"),
        "user": parsed.username,
        "password": unquote(parsed.password or ""),
        "host": parsed.hostname,
        "port": parsed.port,
    }

    def connect():
        return psycopg2.connect(**dsn)

    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name <> 'alembic_version'"
        )
        assert cur.fetchone()[0] == 0, "CLEAN_CHAIN_DATABASE_URL phải trỏ tới DB trống"

    env = os.environ.copy()
    env["DATABASE_URL"] = os.environ["CLEAN_CHAIN_DATABASE_URL"]
    subprocess.run(
        ["backend/.venv/bin/alembic", "upgrade", "head"],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )

    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT version_num FROM alembic_version")
        assert cur.fetchone()[0] == HEAD
        cur.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        tables = {row[0] for row in cur.fetchall()}
        assert {"folders", "subjects", "document_ratings", "community_submissions", "folder_tags"} <= tables
        cur.execute("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'")
        assert "community_subject_stats" in {row[0] for row in cur.fetchall()}
        cur.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = 'folders' AND column_name = 'created_at'"
        )
        assert cur.fetchone()[0] == "timestamp with time zone"
