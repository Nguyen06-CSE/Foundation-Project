#!/bin/sh
set -e

# Chạy Alembic migration trước khi khởi động tiến trình ứng dụng
echo "==> [Entrypoint] Running database migrations (alembic upgrade head)..."
alembic upgrade head

# Khởi động ứng dụng chính với các tham số truyền vào
echo "==> [Entrypoint] Starting application: $@"
exec "$@"
