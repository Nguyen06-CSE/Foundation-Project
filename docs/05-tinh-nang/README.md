---
title: Đặc Tả Các Phân Hệ Tính Năng Nghiệp Vụ
sidebar_label: 🚀 Tổng quan Tính năng
sidebar_position: 1
---

# 🚀 ĐẶC TẢ CÁC PHÂN HỆ TÍNH NĂNG NGHIỆP VỤ — FOUNDATION PROJECT

Phân hệ tài liệu này tổng hợp toàn bộ các tính năng của **Foundation Project**, được quy hoạch lại theo **7 phân hệ nghiệp vụ mạch lạc** thay vì phân mảnh theo từng tệp kỹ thuật rời rạc.

Mỗi tài liệu phân hệ tuân thủ cấu trúc chuẩn mực gồm 6 phần: Mục đích, Luồng nghiệp vụ (Sequence Diagram), Quy tắc nghiệp vụ, Mô hình dữ liệu, Tương tác API/UI và Giới hạn kỹ thuật.

---

## 🗺️ Bản Đồ 7 Phân Hệ Nghiệp Vụ

| Phân hệ | Tài liệu chi tiết | Trọng tâm nghiệp vụ |
| :---: | :--- | :--- |
| **01** | [**Kho Cá Nhân & Quản Lý Tài Liệu**](./01-kho-ca-nhan-va-quan-ly-tai-lieu.md) | Dashboard cá nhân, tải lên tệp tin, khử trùng SHA-256, nhãn thẻ, danh sách đọc, chế độ xem và thùng rác phục hồi |
| **02** | [**Kho Nhóm & Không Gian Làm Việc**](./02-kho-nhom-va-khong-gian-lam-viec.md) | Quản lý Workspace, mời thành viên, phân quyền Owner/Admin/Member, thẻ nhóm, tài liệu nhóm và giải thể an toàn |
| **03** | [**Kho Học Liệu Số & Duyệt Tài Liệu**](./03-kho-hoc-lieu-va-duyet-tai-lieu.md) | Thư viện cộng đồng toàn trường, quy trình nộp duyệt 3 trạng thái, phân loại Khoa/Môn học, đánh giá sao và gói học liệu |
| **04** | [**Tìm Kiếm Toàn Văn & Tra Cứu**](./04-tim-kiem-va-tra-cuu.md) | Bộ máy tìm kiếm PostgreSQL FTS GIN Index, tiếng Việt không dấu, bộ lọc đa tiêu chí, xếp hạng và phân trang |
| **05** | [**Xem Trước & Xử Lý Nội Dung**](./05-xem-truoc-va-xu-ly-noi-dung.md) | Trình xem trước PDF/Office phía Client, trích xuất ảnh bìa/cover tự động và trình soạn thảo/hiển thị Markdown |
| **06** | [**Chia Sẻ & Liên Kết Tài Liệu**](./06-chia-se-va-lien-ket-tai-lieu.md) | Chia sẻ liên kết nội bộ/công khai có hạn sử dụng, chống trùng lặp bằng Partial Index, sao chép/forking tài liệu |
| **07** | [**Nhật Ký Hoạt Động & Thống Kê**](./07-nhat-ky-hoat-dong-va-thong-ke.md) | Ghi nhận nhật ký tương tác ActivityAction, nhật ký tải xuống, thống kê truy cập và thuật toán tính điểm xu hướng |

> 🔧 **Tài liệu kỹ thuật bổ sung**: [Tối ưu lọc tài liệu & trạng thái loading](./08-toi-uu-loc-tai-lieu-va-loading.md) — stale-while-revalidate, lọc optimistic, debounce/hủy request và index `download_logs`.

---

Xem thêm [Thùng rác và vòng đời tài liệu khi giải tán nhóm](./09-thung-rac-va-giai-tan-nhom.md).

## 📋 Biểu Mẫu Chuẩn Hóa
Để phục vụ việc mở rộng các tính năng mới trong tương lai hoặc làm mẫu báo cáo đồ án, vui lòng tham khảo:
👉 [**Biểu Mẫu Chuẩn Đặc Tả Tính Năng (Feature Template)**](./template-tai-lieu-tinh-nang.md).
