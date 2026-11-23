---
title: Yêu Cầu Môi Trường & Cài Đặt Tiên Quyết
sidebar_label: ⚙️ Cài đặt môi trường
sidebar_position: 2
---

# ⚙️ YÊU CẦU MÔI TRƯỜNG & CÀI ĐẶT TIÊN QUYẾT

Trước khi tiến hành chạy hệ thống **Foundation Project**, máy tính của bạn cần được cài đặt sẵn 3 thành phần cốt lõi: **Python 3.10+**, **Node.js 18+**, và **PostgreSQL 15+**.

---

## 1. Bảng Tiêu Chuẩn Môi Trường

| Thành phần | Phiên bản khuyến nghị | Mục đích sử dụng | Kiểm tra cài đặt |
| :--- | :--- | :--- | :--- |
| **Python** | `3.11.x` hoặc `3.12.x` (Tối thiểu `3.10`) | Chạy Backend API (FastAPI, SQLAlchemy, Alembic) | `python3 --version` |
| **Node.js** | `v20.x LTS` (Tối thiểu `v18.x`) | Chạy Frontend UI (Vite, React, Tailwind CSS) | `node --version` |
| **npm** | `10.x+` (Đi kèm Node.js) | Trình quản lý gói phụ thuộc Frontend | `npm --version` |
| **PostgreSQL**| `15.x` hoặc `16.x` | Hệ quản trị cơ sở dữ liệu quan hệ cục bộ | `psql --version` |
| **Git** | `2.30+` | Quản lý phiên bản mã nguồn | `git --version` |

---

## 2. Hướng Dẫn Cài Đặt Theo Từng Hệ Điều Hành

### 2.1. Hệ điều hành macOS (Sử dụng Homebrew)

```bash
# 1. Cài đặt Python 3.11 và Node.js LTS
brew install python@3.11 node postgresql@15 git

# 2. Khởi động dịch vụ PostgreSQL
brew services start postgresql@15

# 3. Tạo người dùng mặc định postgres (nếu chưa có)
createuser -s postgres
```

### 2.2. Hệ điều hành Linux (Ubuntu / Debian)

```bash
# 1. Cập nhật chỉ mục gói phần mềm
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Python và môi trường ảo venv
sudo apt install -y python3 python3-pip python3-venv git

# 3. Cài đặt Node.js qua NodeSource (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Cài đặt và kích hoạt PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# 5. Đặt mật khẩu cho người dùng postgres
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### 2.3. Hệ điều hành Windows

- **Python**: Tải bản cài đặt từ [python.org](https://www.python.org/downloads/). *Lưu ý tích chọn: "Add Python to PATH"*.
- **Node.js**: Tải bản LTS từ [nodejs.org](https://nodejs.org/).
- **PostgreSQL**: Tải bộ cài PostgreSQL 15+ từ [enterprisedb.com](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads). Đặt mật khẩu cho tài khoản `postgres` (ví dụ: `postgres`) và ghi nhớ cổng mặc định `5432`.
- Hoặc sử dụng **Docker Desktop**:
  ```bash
  docker run --name elibrary-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=elibrary_db -p 5432:5432 -d postgres:15-alpine
  ```
