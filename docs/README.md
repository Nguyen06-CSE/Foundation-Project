# 📚 Tài Liệu Hướng Dẫn Cấu Trúc Dự Án (Project Documentation Guide)

Chào mừng bạn đến với tài liệu hướng dẫn cấu trúc thư mục `docs/`. Tài liệu này giúp các thành viên trong đội ngũ (Developer, PM, QA, Designer) nhanh chóng nắm bắt vị trí và mục đích của từng tài liệu liên quan đến dự án.

---

## 🗂 Cây Thư Mục Tổng Quan

```text
docs/
├── feat/                           # Tài liệu kỹ thuật chi tiết của từng tính năng
│   ├── bundle/                     # Đặc tả kỹ thuật mô-đun Bundle
│   └── community-library/          # Đặc tả kỹ thuật thư viện cộng đồng
├── project-management/             # Quản lý tiến độ, kế hoạch & định hướng dự án
│   ├── Task Assignment/            # Phân rã và phân công công việc
│   ├── backlog.md                  # Ý tưởng mới & tính năng cần cải thiện
│   ├── known-issues.md             # Lỗi đã biết & nợ kỹ thuật (technical debt)
│   ├── roadmap.md                  # Định hướng phát triển & lộ trình giai đoạn tiếp theo
│   ├── MoTaDuAn.MD                 # Mô tả tổng quan về dự án
│   ├── PROJECT_STATUS_REPORT.md    # Báo cáo tình trạng/tiến độ dự án hiện tại
│   └── mau-slide-thuyet-trinh.md   # Khung dàn ý/nội dung slide thuyết trình
├── references/                     # Tài nguyên & dữ liệu tham khảo
│   ├── image/                      # Hình ảnh giao diện mẫu, sơ đồ minh họa
│   └── sql/                        # Script cơ sở dữ liệu mẫu, schema tham khảo
└── system-architecture/            # Kiến trúc hệ thống
    ├── architecture/               # Sơ đồ và tài liệu kiến trúc tổng thể
    └── flow/                       # Lưu đồ nghiệp vụ, sequence diagram, luồng dữ liệu
```

---

## 📖 Chi Tiết Từng Mục & Vị Trí Cần Tìm

### 1. `feat/` — Tài Liệu Đặc Tả Tính Năng (Feature Specifications)
Nơi chứa toàn bộ tài liệu kỹ thuật của các tính năng/mô-đun trong hệ thống:

- **`bundle/`**:
  - `API.md`: Danh sách và quy chuẩn các API endpoints liên quan đến Bundle.
  - `BUSINESS_RULES.md`: Quy tắc nghiệp vụ, logic xử lý của Bundle.
  - `DATABASE.md`: Thiết kế lược đồ dữ liệu, bảng, quan hệ thuộc mô-đun này.
  - `FRONTEND.md`: Yêu cầu triển khai, luồng xử lý trên phía giao diện (UI/UX logic).
  - `README.md`: Hướng dẫn tổng quan về mô-đun Bundle.
- **`community-library/`**:
  - `spec.md`: Tài liệu đặc tả yêu cầu (requirements/specifications).
  - `implementation.md`: Hướng dẫn triển khai kỹ thuật.
  - `management-extension.md`: Đặc tả mở rộng quản lý cho thư viện cộng đồng.

---

### 2. `project-management/` — Quản Lý Dự Án, Kế Hoạch & Vấn Đề
Dành cho việc theo dõi tiến độ, phân chia công việc và định hướng:

#### 🎯 Định hướng, Cải tiến & Lỗi (Mới cập nhật):
- **`roadmap.md`**:
  - **Chứa gì:** Lộ trình phát triển sản phẩm (Product Roadmap), các mốc thời gian (milestones), định hướng tính năng trong các giai đoạn (Phase 2, Phase 3,...).
  - **Dành cho:** Khi bạn muốn biết sắp tới dự án sẽ làm gì và ưu tiên mục tiêu nào.
- **`backlog.md`**:
  - **Chứa gì:** Ý tưởng mới, danh sách các đề xuất cải tiến tính năng hiện có, các tính năng chờ triển khai.
  - **Dành cho:** Khi bạn muốn đề xuất hoặc tìm xem tính năng nào cần tối ưu trong tương lai.
- **`known-issues.md`**:
  - **Chứa gì:** Danh sách các lỗi đã biết (known bugs), hạn chế của hệ thống hiện tại, và nợ kỹ thuật (technical debt) cần tái cấu trúc (refactor).
  - **Dành cho:** Dev & QA ghi nhận các vấn đề chưa xử lý ngay nhưng cần theo dõi.

#### 📋 Phân công & Tiến độ:
- **`Task Assignment/`**:
  - `PhanRaChucNang.md` & `BoSung-PhanRaChucNang.md`: Bảng phân rã chi tiết các tính năng cần làm.
  - `PhanRaCongViec_TongQuat.xlsx` & `PhanRaCongViec_ChiTiet.xlsx`: Bảng tính theo dõi đầu việc, người thực hiện và tiến độ.
- **`MoTaDuAn.MD`**: Giới thiệu mục tiêu, đối tượng sử dụng và phạm vi bài toán của dự án.
- **`PROJECT_STATUS_REPORT.md`**: Cập nhật tiến độ định kỳ (đã làm được gì, đang gặp khó khăn gì).
- **`mau-slide-thuyet-trinh.md`**: Hướng dẫn và cấu trúc chuẩn bị slide demo/báo cáo dự án.

---

### 3. `references/` — Tài Liệu & Dữ Liệu Tham Khảo
- **`image/`**: Chứa mockup, wireframe, ảnh minh họa hoặc ảnh chụp màn hình tham khảo.
- **`sql/`**: Lưu trữ các file script `.sql` khởi tạo dữ liệu mẫu, schema ban đầu hoặc câu lệnh truy vấn mẫu.

---

### 4. `system-architecture/` — Kiến Trúc Hệ Thống
- **`architecture/`**: Sơ đồ cấu trúc các tầng dịch vụ (Microservices/Monolith, Tech Stack, Cloud infrastructure,...).
- **`flow/`**: Các sơ đồ tuần tự (Sequence Diagram), sơ đồ luồng dữ liệu (Data Flow Diagram) và Activity Diagram cho các luồng nghiệp vụ chính.

---

## 💡 Quy Ước Khi Cập Nhật Tài Liệu

1. **Thêm tính năng mới:** Tạo thư mục riêng trong `docs/feat/<tên-tính-năng>/` và có file mô tả cụ thể.
2. **Phát hiện bug hoặc cần ghi nhận nợ kỹ thuật:** Cập nhật ngay vào `docs/project-management/known-issues.md`.
3. **Đề xuất ý tưởng hoặc cải tiến:** Thêm đầu việc vào `docs/project-management/backlog.md`.
4. **Thay đổi cấu trúc:** Vui lòng cập nhật lại file này (`docs/README.md` hoặc `DOCUMENTATION_GUIDE.md`) để đảm bảo thông tin luôn đồng nhất.