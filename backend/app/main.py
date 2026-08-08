from fastapi import FastAPI

app = FastAPI(
    title="Thư Viện Số - Quản Lí Tài Liệu",
    description="Hệ thống quản tài liệu số của thư viện",
    version="0.1.0",
)

@app.get("/health")
def health_check():
    return {"status": "ok"}