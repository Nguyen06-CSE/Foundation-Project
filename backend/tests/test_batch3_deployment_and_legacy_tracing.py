import io
import os
import subprocess
from datetime import datetime
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory

from app.models.base import Base
from app.models.processing_job import ProcessingJob
from app.models.trash_batch import TrashBatch
from app.models.category import Category
from app.models.document import Document
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.document import DocumentOut
from app.main import app


def test_migration_chain_is_single_head():
    """Kiểm tra cây migration Alembic chỉ có duy nhất một head."""
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"Kỳ vọng 1 head duy nhất nhưng nhận {heads}"
    assert heads[0] == "b3c4d5e6f7a8"


def test_legacy_artifacts_and_models_preservation():
    """Kiểm tra ProcessingJob và TrashBatch đã được tách khỏi SQLAlchemy metadata,
    quan hệ ORM legacy được gỡ bỏ, và schema DocumentOut vẫn giữ trash_batch_id nullable."""
    # 1. ProcessingJob (truly unused: marked deprecated in docstring, detached from Base)
    assert ProcessingJob.__doc__ is not None
    assert "DEPRECATED" in ProcessingJob.__doc__
    assert ProcessingJob.__tablename__ == "processing_jobs"
    assert "processing_jobs" not in Base.metadata.tables, "processing_jobs không được nằm trong Base.metadata.tables"

    # 2. TrashBatch (detached from Base)
    assert TrashBatch.__tablename__ == "trash_batches"
    assert hasattr(TrashBatch, "documents")
    assert "trash_batches" not in Base.metadata.tables, "trash_batches không được nằm trong Base.metadata.tables"

    # 3. Document.trash_batch_id & Document.trash_batch (bảo tồn thuộc tính class để tương thích)
    assert hasattr(Document, "trash_batch_id")
    assert Document.trash_batch_id is None
    assert hasattr(Document, "trash_batch")
    assert Document.trash_batch is None

    # 4. ORM relationships legacy trên User và Workspace đã được gỡ bỏ
    assert not hasattr(User, "deleted_trash_batches"), "User không còn quan hệ deleted_trash_batches"
    assert not hasattr(Workspace, "trash_batches"), "Workspace không còn quan hệ trash_batches"

    # 5. DocumentOut Pydantic schema bảo toàn contract API (trash_batch_id nullable)
    doc_out = DocumentOut(
        id=999,
        owner_id=1,
        title="Test Document",
        file_path="/docs/test.pdf",
        checksum="testchecksum123",
        is_important=False,
        is_deleted=False,
        is_orphaned=False,
        is_bundle=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert doc_out.trash_batch_id is None
    dumped = doc_out.model_dump()
    assert "trash_batch_id" in dumped
    assert dumped["trash_batch_id"] is None

    # 6. Category (bảo tồn nguyên vẹn category.py, không sửa model)
    assert Category.__tablename__ == "categories"
    assert hasattr(Category, "sub_categories")
    assert hasattr(Category, "documents")


def test_offline_downgrade_sql_contains_safety_checks():
    """Kiểm tra offline downgrade SQL của revision a2b3c4d5e6f7 có đủ parent checks và sequence sync."""
    cmd = [
        "backend/.venv/bin/alembic",
        "downgrade",
        "--sql",
        "a2b3c4d5e6f7:f1a2b3c4d5e6",
    ]
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql+asyncpg://dummy:dummy@localhost:5432/dummy"
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=True,
        env=env,
    )
    sql_output = result.stdout
    # Kiểm tra parent validation block
    assert "RAISE EXCEPTION" in sql_output
    assert "parent workspace id=3 not found" in sql_output
    assert "parent user id=6 not found" in sql_output
    # Kiểm tra sequence sync
    assert "pg_get_serial_sequence('trash_batches', 'id')" in sql_output
    assert "pg_get_serial_sequence('processing_jobs', 'id')" in sql_output
    # Kiểm tra DDL khôi phục bảng
    assert "CREATE TABLE IF NOT EXISTS trash_batches" in sql_output
    assert "CREATE TABLE IF NOT EXISTS processing_jobs" in sql_output
    assert "ALTER TABLE documents ADD COLUMN IF NOT EXISTS trash_batch_id" in sql_output


def test_deployment_entrypoint_exists_and_executable():
    """Kiểm tra script entrypoint chuẩn cho deployment tồn tại và có quyền thực thi."""
    entrypoint = Path("backend/entrypoint.sh")
    assert entrypoint.exists(), "backend/entrypoint.sh phải tồn tại"
    assert os.access(entrypoint, os.X_OK), "backend/entrypoint.sh phải có quyền thực thi (+x)"


def test_categories_api_routes_active():
    """Kiểm tra các route API /categories vẫn được nạp và hoạt động trong app."""
    routes = [r.path for r in app.routes]
    assert "/categories/" in routes
    assert "/categories/{category_id}" in routes
