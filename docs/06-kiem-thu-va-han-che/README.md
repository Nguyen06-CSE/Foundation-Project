---
title: Kiểm Thử Phần Mềm & Đánh Giá Giới Hạn Hệ Thống
sidebar_label: 🧪 Tổng quan QA & Giới hạn
sidebar_position: 1
---

# 🧪 KIỂM THỬ PHẦN MỀM & ĐÁNH GIÁ GIỚI HẠN HỆ THỐNG

Phân hệ tài liệu này cung cấp báo cáo toàn diện, trung thực và khách quan về công tác đảm bảo chất lượng phần mềm (Quality Assurance), ma trận kịch bản kiểm thử (Test Cases Matrix), cùng phần tự đánh giá các giới hạn kỹ thuật đã biết của đồ án **Foundation Project** phục vụ Hội đồng phản biện.

---

## 🗺️ Danh Mục Tài Liệu Chi Tiết

| Tài liệu | Trọng tâm học thuật & Nội dung chi tiết |
| :--- | :--- |
| [**Chiến Lược & Kế Hoạch Kiểm Thử**](./chien-luoc-va-ke-hoach-kiem-thu.md) | Kim tự tháp kiểm thử, công cụ thực thi (pytest, pytest-asyncio, httpx) và phương pháp kiểm thử hồi quy |
| [**Ma Trận Ca Kiểm Thử Trọng Yếu (Test Cases)**](./kich-ban-kiem-thu.md) | Bộ kịch bản chi tiết bao quát 6 Use Cases cốt lõi: Xác thực, Upload/Deduplication, Kho nhóm, Kho học liệu, Tìm kiếm, Chia sẻ |
| [**Hiện Trạng & Giới Hạn Đã Biết Của Hệ Thống**](./hien-trang-va-gioi-han-he-thong.md) | Đánh giá khách quan: Các kết quả đạt được, các khoảng trống kiểm thử, giới hạn kiến trúc và lộ trình hoàn thiện |

---

## 🎯 Góc Nhìn Bảo Vệ Đồ Án (Academic Defense Perspective)

Trong một đồ án tốt nghiệp hoặc đồ án cơ sở ngành Công nghệ Thông tin, việc **thẳng thắn nhận diện các giới hạn kỹ thuật** và **giải thích rõ ràng các quyết định đánh đổi (Trade-offs)** có giá trị khoa học cao hơn nhiều so với việc đưa ra các tuyên bố tiếp thị không có bằng chứng.

Tài liệu trong phân hệ này được xây dựng trên tinh thần trung thực khoa học, bám sát từng file test thực tế trong thư mục `backend/tests/`.
