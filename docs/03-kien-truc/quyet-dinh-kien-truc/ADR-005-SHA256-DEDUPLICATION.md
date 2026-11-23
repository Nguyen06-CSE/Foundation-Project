---
title: "ADR-005: Giải Thuật Khử Trùng Lặp Lưu Trữ Bằng Mã Băm SHA-256"
sidebar_label: "ADR-005: Khử trùng SHA-256"
sidebar_position: 5
---

# ADR-005: GIẢI THUẬT KHỬ TRÙNG LẶP LƯU TRỮ BẰNG MÃ BĂM SHA-256

- **Trạng thái**: Đã chấp thuận (Accepted)
- **Ngày quyết định**: 2026-11-01

---

## 1. Bối Cảnh
Trong môi trường học tập, hiện tượng nhiều sinh viên cùng tải lên cùng một bản sao tài liệu (đề thi, bài tập mẫu, sách giáo trình) xảy ra rất phổ biến, dẫn đến lãng phí không gian đĩa cứng cục bộ.

## 2. Quyết Định
Ứng dụng giải thuật hàm băm **SHA-256** để tính toán mã đại diện duy nhất (`checksum`) của dòng dữ liệu nhị phân tệp tin ngay trong bộ nhớ trước khi quyết định ghi vào ổ cứng:
- Mã băm SHA-256 có độ dài 256-bit (64 ký tự Hex).
- Tỷ lệ xảy ra xung đột băm (Hash Collision) là cực kỳ nhỏ ($2^{-256}$), hoàn toàn đảm bảo độ tin cậy tuyệt đối trong thực tế.

## 3. Hệ Quả
- **Ưu điểm**: Tiết kiệm đáng kể dung lượng đĩa cứng; tốc độ xử lý nhanh.
- **Hạn chế**: Tốn thêm một lượng nhỏ thời gian tính toán CPU để băm dữ liệu khi upload tệp tin lớn.
