# Foundation-Project

## Các lệnh Docker bạn sẽ dùng thường xuyên
```bash
docker compose up -d          # khởi động container (chạy nền)
docker compose down           # tắt container (dữ liệu vẫn còn vì có volume)
docker compose down -v        # tắt VÀ xóa luôn volume (mất hết data — cẩn thận!)
docker compose logs -f db     # xem log của PostgreSQL để debug
docker exec -it elibrary psql -U postgres -d mydatabase   # vào thẳng psql trong container để gõ SQL trực tiếp

# các lệnh tắt trong psql
\dt : Hiển thị danh sách tất cả các bảng (tables) đang có trong database.
\d <tên_bảng> : Xem cấu trúc chi tiết của một bảng (ví dụ: \d test_table).
\l : Hiển thị danh sách tất cả cơ sở dữ liệu.
\c <tên_db> : Chuyển sang cơ sở dữ liệu khác (ví dụ: \c edumanage).
\q : Thoát khỏi psql để quay lại Terminal .
```