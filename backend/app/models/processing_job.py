# backend/app/models/processing_job.py
"""
DEPRECATED (Batch 3 / Phase 4): Bảng processing_jobs và mô hình ORM tương ứng đã được loại bỏ
khỏi cơ sở dữ liệu và Base.metadata trong migration a2b3c4d5e6f7.
Các tác vụ OCR, sinh thumbnail và trích xuất text hiện dùng trực tiếp FastAPI BackgroundTasks
thông qua file_service/document_service.
File này được giữ lại như một legacy stub để duy trì khả năng tương thích mã nguồn.
"""
from typing import Optional


class ProcessingJob:
    """
    DEPRECATED (Batch 3): Bảng processing_jobs không còn được sử dụng trong luồng xử lý runtime.
    Các tác vụ OCR, sinh thumbnail và trích xuất text hiện dùng trực tiếp FastAPI BackgroundTasks
    thông qua file_service/document_service.
    """
    __tablename__ = "processing_jobs"

    id: Optional[int] = None
    document_id: Optional[int] = None
    job_type: Optional[str] = None
    status: Optional[str] = "pending"
    result: Optional[dict] = None
    finished_at: Optional[object] = None
    document: Optional[object] = None
