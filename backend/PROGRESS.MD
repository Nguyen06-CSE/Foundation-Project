# PROGRESS

## Trạng thái hiện tại
Đã hoàn thành phần lớn backend cho luồng thư viện số cơ bản: schemas, services, routers, migration PostgreSQL cho search, main app registration, và bộ test cốt lõi.  
Lưu ý đang theo dõi: `python-jose` và `bcrypt` không ổn định trong môi trường hiện tại nên `app/core/security.py` đã có fallback để test/chạy dev không bị chặn.

## Các việc đã hoàn thành
- [x] Tạo schemas cho `auth`, `user`, `document`, `category`, `tag`, `note`, `favorite`
- [x] Tách service `file_service.py`, `document_service.py`, `search_service.py`
- [x] Thêm util checksum riêng
- [x] Viết lại routers cho `auth`, `users`, `categories`, `tags`, `documents`, `document_versions`, `notes`, `favorites`, `download_logs`, `search`
- [x] Cập nhật `main.py` để include toàn bộ router
- [x] Thêm migration PostgreSQL cho `unaccent`, `pg_trgm`, trigger `documents_search_vector_update()`, GIN index
- [x] Tạo test fixtures và test cho auth, documents, search, categories/tags
- [x] Chạy kiểm tra syntax và test, hiện tại toàn bộ test đều pass

## Việc tiếp theo
1. Kết nối các router/service này với database thật để kiểm tra end-to-end trên PostgreSQL, nhất là upload tài liệu, search và trigger `search_vector`.
2. Bổ sung API chi tiết cho `document_versions`, `download_logs` và gắn log download/ngầm trong service khi có luồng xem/tải tài liệu.
3. Đồng bộ lại model/schemas với seed data và ràng buộc thực tế, rồi chạy Swagger `/docs` để rà response model và status code.

## Ngữ cảnh kỹ thuật
- Backend hiện dùng `AsyncSession`, nên router/service mới viết theo async để thống nhất với `core/database.py`.
- `Document` đang có cột `search_vector` kiểu PostgreSQL `TSVECTOR`; migration mới sẽ tự cập nhật cột này qua trigger thay vì để router tự xử lý.
- Bộ test hiện là kiểu cô lập bằng dependency override và fake session để phù hợp môi trường workspace; khi có DB test riêng thì có thể nâng lên integration test thực.
- `app/core/security.py` có fallback JWT và hash mật khẩu để tránh phụ thuộc hoàn toàn vào package chưa sẵn có trong môi trường hiện tại.
