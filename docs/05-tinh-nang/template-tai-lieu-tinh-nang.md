---
title: Biểu Mẫu Chuẩn Đặc Tả Tính Năng (Feature Specification Template)
sidebar_label: 📝 Biểu mẫu tính năng
sidebar_position: 2
---

# 📝 BIỂU MẪU CHUẨN ĐẶC TẢ TÍNH NĂNG (FEATURE TEMPLATE)

*Tài liệu mẫu này định nghĩa cấu trúc 6 phần bắt buộc cho mọi tài liệu nghiệp vụ trong đồ án.*

---

## 1. Mục Đích & Bối Cảnh Nghiệp Vụ (Context & Objective)
- Nêu rõ vấn đề thực tiễn cần giải quyết.
- Đối tượng người dùng mục tiêu (Sinh viên, Giảng viên, Quản trị viên).
- Giá trị mang lại cho hệ sinh thái học liệu số.

## 2. Luồng Nghiệp Vụ (Workflow & Sequence Diagram)
- Biểu đồ tuần tự (Mermaid Sequence Diagram) mô phỏng tương tác giữa Người dùng -> Frontend -> Backend API -> PostgreSQL / Storage.
- Mô tả các bước xử lý từ lúc bắt đầu đến khi kết thúc.

## 3. Quy Tắc Nghiệp Vụ & Ràng Buộc (Business Rules)
- Các điều kiện tiên quyết (Prerequisites).
- Quy tắc kiểm thực dữ liệu (Validation Rules).
- Xử lý các tình huống ngoại lệ (Edge Cases).

## 4. Mô Hình Dữ Liệu & Thực Thể (Data Model & Schema)
- Bảng CSDL liên quan và các trường cốt lõi.
- Ràng buộc khóa ngoại, chỉ mục (Index), trạng thái enum.

## 5. Tương Tác API & Giao Diện Người Dùng (API & UI)
- Danh sách các endpoints RESTful (Method, Path, Request Body, Response Code).
- Thành phần giao diện (UI Components), tương tác người dùng, thông báo Toast.

## 6. Giới Hạn Kỹ Thuật & Hướng Phát Triển (Limitations & Trade-offs)
- Các giới hạn hiện tại của hệ thống.
- Đánh giá đánh đổi kỹ thuật.
- Đề xuất nâng cấp trong tương lai.
