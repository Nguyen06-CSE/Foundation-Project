from fastapi import FastAPI

from app.routers.auth import router as auth_router
from app.routers.categories import router as categories_router
from app.routers.download_logs import router as download_logs_router
from app.routers.documents import router as documents_router
from app.routers.document_versions import router as document_versions_router
from app.routers.favorites import router as favorites_router
from app.routers.notes import router as notes_router
from app.routers.search import router as search_router
from app.routers.tags import router as tags_router
from app.routers.users import router as users_router

app = FastAPI(
    title="Thư Viện Số - Quản Lí Tài Liệu",
    description="Hệ thống quản tài liệu số của thư viện",
    version="0.1.0",
)


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


@app.get("/health")
def health_check():
    return {"status": "ok"}
