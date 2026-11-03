# backend/app/main.py

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import workspace_tags
from app.routers.academic import router as academic_router
from app.routers.auth import router as auth_router
from app.routers.categories import router as categories_router
from app.routers.document_versions import router as document_versions_router
from app.routers.documents import router as documents_router
from app.routers.download_logs import router as download_logs_router
from app.routers.favorites import router as favorites_router
from app.routers.folders import router as folders_router
from app.routers.groups import router as groups_router
from app.jobs.scheduler import register_jobs, scheduler
from app.routers.notes import router as notes_router
from app.routers.notifications import router as notifications_router
from app.routers.search import router as search_router
from app.routers.tags import router as tags_router
from app.routers.trash import router as trash_router
from app.routers.users import router as users_router
from app.routers.workspaces import router as workspaces_router
from app.routers.library import router as library_router
from app.routers.stats import router as stats_router
from app.routers.dashboard import router as dashboard_router
from app.routers.todos import router as todos_router

app = FastAPI(
    title="Thư Viện Số - Quản Lí Tài Liệu",
    description="Hệ thống quản tài liệu số của thư viện",
    version="0.1.0",
)

# Đảm bảo thư mục lưu trữ thumbnail tồn tại và mount static path
os.makedirs("storage/thumbnails", exist_ok=True)
os.makedirs("storage/personal", exist_ok=True)
os.makedirs("storage/groups", exist_ok=True)
os.makedirs("storage/orphaned", exist_ok=True)
os.makedirs("storage/community", exist_ok=True)
os.makedirs("storage/markdowns", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://macbook-pro-2.taile4a1e8.ts.net",
        "https://foundation-project-murex.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký tất cả các router
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(tags_router)
app.include_router(documents_router)
app.include_router(document_versions_router)
app.include_router(notes_router)
app.include_router(favorites_router)
app.include_router(download_logs_router)
app.include_router(search_router)
app.include_router(workspaces_router)
app.include_router(trash_router)
app.include_router(academic_router)
app.include_router(notifications_router)
app.include_router(folders_router)
app.include_router(groups_router)
app.include_router(workspace_tags.router)
app.include_router(library_router)
app.include_router(stats_router)
app.include_router(dashboard_router)
app.include_router(todos_router)


@app.on_event("startup")
async def startup():
    try:
        from sqlalchemy import text
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(text("ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50)"))
            await db.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255)"))
            await db.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS user_todos (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        note TEXT,
                        task_type VARCHAR(30) NOT NULL DEFAULT 'custom',
                        document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
                        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
                        start_at TIMESTAMPTZ,
                        due_at TIMESTAMPTZ,
                        priority VARCHAR(10) NOT NULL DEFAULT 'normal',
                        remind_before_minutes INTEGER DEFAULT 30,
                        reminded_at TIMESTAMPTZ,
                        completed_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                    """
                )
            )
            await db.commit()
    except Exception:
        pass
    if not scheduler.running:
        register_jobs()
        scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    if scheduler.running:
        scheduler.shutdown()


@app.get("/health")
def health_check():
    return {"status": "ok"}
