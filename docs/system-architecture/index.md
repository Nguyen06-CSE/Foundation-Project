---
id: index
title: Kiến Trúc Hệ Thống
sidebar_position: 1
---

# Kiến Trúc Hệ Thống

Tổng quan kiến trúc tổng thể và luồng dữ liệu của hệ thống **Digital Library (Thư Viện Số)**.

---

## Sơ Đồ Kiến Trúc Tổng Thể

> Hệ thống sử dụng mô hình **Hybrid Cloud Storage Architecture** kết hợp Cloudflare R2, FastAPI Backend và React Frontend.

![System Architecture - Light Mode](./architecture/foundation-system-architecture.visual-check.1440x900.light.png)

---

## Luồng Dữ Liệu (Data Flow)

> Mô tả luồng dữ liệu từ upload tài liệu, xử lý OCR/Thumbnail đến khi hiển thị cho người dùng.

![Data Flow Diagram - Light Mode](./flow/foundation-dataflow.visual-check.1440x900.light.png)

---

## Tài Liệu Liên Quan

- [Hệ Thống Lưu Trữ (Storage System)](../architecture/STORAGE_SYSTEM) — Chi tiết về Storage architecture
- [Deployment & Storage R2](../deployment/STORAGE_R2) — Cấu hình Cloudflare R2
- [Biến Môi Trường](../deployment/ENV_VARIABLES) — Danh sách environment variables
