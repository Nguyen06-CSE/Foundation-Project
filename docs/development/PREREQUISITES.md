---
id: PREREQUISITES
title: Yêu Cầu Tiên Quyết
sidebar_position: 2
---

# 📦 Yêu Cầu Tiên Quyết (Prerequisites & Environment Setup)

Tài liệu này hướng dẫn chi tiết cách cài đặt các công cụ nền tảng cần thiết trên máy tính của bạn (hỗ trợ macOS, Linux Ubuntu/Debian, và Windows qua WSL2).

---

## 1. Bảng Tổng Hợp Công Cụ Cần Thiết

| Công cụ | Phiên bản khuyến nghị | Mục đích sử dụng | Kiểm tra phiên bản |
|---|:---:|---|---|
| **Python** | `3.11` hoặc `3.12` | Runtime cho máy chủ Backend FastAPI | `python3 --version` |
| **Node.js** | `20 LTS` (hoặc 18+) | Runtime cho công cụ biên dịch Frontend Vite | `node --version` |
| **PostgreSQL** | `14`, `15` hoặc `16` | Hệ quản trị cơ sở dữ liệu quan hệ | `psql --version` |
| **Docker** | Mới nhất (Tùy chọn) | Chạy PostgreSQL mà không cần cài đặt trực tiếp | `docker --version` |
| **Git** | `2.30+` | Quản lý phiên bản mã nguồn | `git --version` |
| **Tesseract OCR** | `5.x` kèm gói `vie` | *(Tùy chọn)* Nhận diện chữ tiếng Việt từ tệp scan | `tesseract --version` |

---

## 2. Hướng Dẫn Cài Đặt Từng Nền Tảng

### 2.1. Cài đặt Python 3.11+
* **macOS (qua Homebrew):**
  ```bash
  brew install python@3.11
  ```
* **Ubuntu / Debian Linux:**
  ```bash
  sudo apt update
  sudo apt install python3.11 python3.11-venv python3-pip
  ```
* **Windows:** Tải bộ cài đặt chính thức từ [python.org](https://www.python.org/downloads/) (Nhớ tích chọn *"Add Python to PATH"* khi cài đặt).

---

### 2.2. Cài đặt Node.js & npm
* Khuyến nghị sử dụng **nvm (Node Version Manager)** để quản lý phiên bản Node.js:
  ```bash
  # Cài đặt nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc  # hoặc source ~/.zshrc trên macOS

  # Cài đặt Node 20 LTS
  nvm install 20
  nvm use 20
  ```

---

### 2.3. Khởi Chạy PostgreSQL (Khuyến nghị dùng Docker)
Cách nhanh nhất và không làm ảnh hưởng đến hệ thống của bạn là sử dụng Docker để tạo container PostgreSQL:

```bash
docker run --name elibrary-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=elibrary \
  -p 5432:5432 \
  -d postgres:15-alpine
```

*Nếu bạn đã cài sẵn PostgreSQL trên máy:*
```bash
# Đăng nhập vào psql và tạo cơ sở dữ liệu mới:
psql -U postgres
CREATE DATABASE elibrary;
\q
```

---

### 2.4. Cài đặt Tesseract OCR (Tiếng Việt)
Tesseract phục vụ tính năng nhận diện văn bản tự động từ các tài liệu scan hình ảnh:
* **macOS:**
  ```bash
  brew install tesseract
  brew install tesseract-lang  # Bao gồm gói dữ liệu tiếng Việt (vie)
  ```
* **Ubuntu / Debian:**
  ```bash
  sudo apt install tesseract-ocr tesseract-ocr-vie
  ```
* **Kiểm tra gói ngôn ngữ đã nạp:**
  ```bash
  tesseract --list-langs
  # Kết quả phải có: vie, eng, osd
  ```
*(Lưu ý: Nếu không cài Tesseract, hệ thống vẫn hoạt động bình thường cho mọi loại tệp PDF text, DOCX, Code; chỉ tính năng nhận diện chữ từ ảnh chụp sẽ rơi về chế độ bỏ qua).*
