---
title: Khắc phục lỗi đếm số lượng tài liệu Kho học liệu cộng đồng
description: Báo cáo kỹ thuật chi tiết về lỗi tính toán document_count bị giới hạn ở mức 1 và phương pháp khắc phục ở Backend & Frontend.
sidebar_label: 🐛 Fix Lỗi Đếm Tài Liệu
---

# BÁO CÁO KỸ THUẬT: KHẮC PHỤC LỖI ĐẾM SỐ LƯỢNG TÀI LIỆU KHO HỌC LIỆU CỘNG ĐỒNG

- **Mã sự cố:** BUG-COMMUNITY-DOC-COUNT-01
- **Mức độ:** **P2 (Major)** — Sai lệch thống kê dữ liệu hiển thị (Data Aggregation Mismatch)
- **Khu vực ảnh hưởng:** `backend/app/routers/library.py`, `frontend/digital-library/src/pages/library/LibraryHome.tsx`
- **Trạng thái:** **RESOLVED (Đã xử lý & Kiểm thử thành công)**

---

## 1. Hiện tượng & Triệu chứng lỗi (Problem Symptoms)

Khi người dùng (tài khoản `nguyen`) đóng góp tài liệu vào hệ thống và được quản trị viên phê duyệt:
- Đã có **1 tài liệu** duyệt vào môn *lập trình app Desktop* (Khoa Công nghệ Thông tin).
- Sau đó tải lên tiếp **4 tài liệu** khác thuộc nhiều môn khác nhau trong Khoa CNTT (*3 tài liệu* vào môn *Kiến trúc máy tính* và *1 tài liệu* vào môn *Cấu trúc dữ liệu và Giải thuật*).
- **Hiện tượng bất thường xảy ra:**
  1. Trên trang chủ Kho học liệu cộng đồng (`/library`), thanh thống kê hiển thị: **`1 Tài liệu`** (thay vì 5).
  2. Thẻ Khoa Công nghệ Thông tin hiển thị: **`1 tài liệu`** (thay vì 5).
  3. Môn *Kiến trúc máy tính* (thực tế có 3 tài liệu công khai) chỉ báo: **`1 tài liệu`**.
  4. Người dùng quan sát thấy chỉ có môn *lập trình app Desktop* báo có 1 tài liệu (khớp với con số 1 ở trang chủ), tạo cảm giác 4 tài liệu mới không được hệ thống ghi nhận vào môn học.
  5. Trong khi đó, tại mục **"Vừa được chia sẻ"** ở trang chủ lại hiển thị đủ **4 tài liệu** mới upload.

---

## 2. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)

### 2.1. Lỗi câu lệnh SQL thống kê ở Backend (`backend/app/routers/library.py`)

Trong file `backend/app/routers/library.py`, ở cả 2 endpoint:
- `GET /library/faculties/` (hàm `get_faculties`)
- `GET /library/faculties/{faculty_id}/subjects/` (hàm `get_subjects_by_faculty`)

Đoạn code đếm số lượng tài liệu được viết như sau:

```python
func.count(
    func.distinct(
        func.nullif(
            and_(Document.is_public == True, Document.is_deleted == False),
            False,
        )
    )
).label("document_count"),
```

#### Cơ chế phát sinh lỗi:
1. **Biểu thức Boolean thay vì Khóa chính (Primary Key):**
   Biểu thức `and_(Document.is_public == True, Document.is_deleted == False)` trả về giá trị kiểu `BOOLEAN` (`TRUE`, `FALSE` hoặc `NULL`).
2. **Hàm `NULLIF(val, FALSE)`:**
   Chuyển đổi giá trị `FALSE` thành `NULL`, giữ lại giá trị `TRUE` (và `NULL`).
3. **Hàm `DISTINCT(...)`:**
   Lấy các giá trị phân biệt trong tập kết quả boolean. Vì mọi bản ghi hợp lệ đều có giá trị là `TRUE`, tập giá trị phân biệt chỉ chứa duy nhất một phần tử: `{TRUE}`.
4. **Hàm `COUNT(...)`:**
   Đếm số lượng giá trị phân biệt đó.
   - Nếu khoa/môn không có tài liệu nào: `COUNT = 0`.
   - Nếu khoa/môn có 1, 3, 5 hay 1.000 tài liệu: `COUNT(DISTINCT TRUE)` **luôn luôn bằng 1**!
5. **Hệ quả dây chuyền:**
   - Môn *Kiến trúc máy tính* có 3 tài liệu -> bị ép về `document_count = 1`.
   - Khoa Công nghệ Thông tin có 5 tài liệu -> bị ép về `document_count = 1`.
   - Trang chủ tính tổng: `faculties.reduce((acc, f) => acc + f.document_count, 0) = 1` -> Báo `1 Tài liệu`.

---

### 2.2. Lỗi lọc và cắt ngắn danh sách môn ở Frontend (`LibraryHome.tsx`)

Tại `frontend/digital-library/src/pages/library/LibraryHome.tsx` (dòng 53–66):
Section "Vừa được chia sẻ" được lấy bằng thuật toán client-side:

```typescript
const responses = await Promise.all(
  recentFacultyIds.map(async (facultyId) => {
    const subjects = await libraryService.getSubjects(facultyId);
    // BUG: .slice(0, 2) chỉ lấy đúng 2 môn học đầu tiên theo bảng chữ cái
    const subjectIds = subjects
      .filter((subject) => subject.document_count > 0)
      .slice(0, 2)
      .map((subject) => subject.id);
    return Promise.all(
      subjectIds.map((subjectId) =>
        libraryService.getDocuments(subjectId, { page: 1, page_size: 5, sort: "newest" })
      )
    );
  })
);
```

#### Cơ chế phát sinh:
1. Danh sách môn học được sắp xếp theo tên (`ORDER BY Subject.name ASC`).
2. Hai môn học có tài liệu đầu tiên là:
   - Môn 1: *Cấu trúc dữ liệu và Giải thuật* (có 1 tài liệu: doc 60).
   - Môn 2: *Kiến trúc máy tính* (có 3 tài liệu: doc 57, 58, 59).
3. Đoạn `.slice(0, 2)` đã cắt bỏ môn thứ 3 là *lập trình app Desktop* (doc 50).
4. Do đó, mục "Vừa được chia sẻ" chỉ gom tài liệu từ 2 môn trên (1 + 3 = 4 tài liệu).
5. Việc gọi API lồng nhau này vừa làm sót dữ liệu vừa tạo ra 4+ lượt request HTTP không cần thiết.

---

## 3. Phương pháp xử lý (Solution & Implementation)

### 3.1. Sửa Backend (`backend/app/routers/library.py`)

Do bảng `Document` đã được `LEFT OUTER JOIN` với điều kiện kiểm tra tài liệu công khai:
```python
.outerjoin(
    Document,
    and_(
        Document.subject_id == Subject.id,
        Document.is_public == True,
        Document.is_deleted == False,
    ),
)
```
Chuẩn SQL chính xác và tối ưu nhất để đếm số lượng tài liệu duy nhất là sử dụng `COUNT(DISTINCT Document.id)`:

```python
# Sửa tại get_faculties (dòng 84) và get_subjects_by_faculty (dòng 140)
func.count(func.distinct(Document.id)).label("document_count"),
```

- Nếu môn/khoa không có tài liệu nào: `Document.id` là `NULL` -> `COUNT` tự động bỏ qua -> trả về `0`.
- Nếu môn/khoa có $N$ tài liệu hợp lệ -> `COUNT(DISTINCT Document.id)` trả về chính xác $N$.

### 3.2. Sửa Frontend (`frontend/digital-library/src/pages/library/LibraryHome.tsx`)

Thay thế toàn bộ đoạn code gọi lặp client-side bằng 1 API call duy nhất tới endpoint tìm kiếm tài liệu cộng đồng:

```typescript
const { data: recentSearchData, isLoading: isRecentLoading } = useQuery({
  queryKey: ["library-home-recent-documents"],
  queryFn: () => libraryService.search({ sort: "newest", page: 1, page_size: 5 }),
  enabled: !isLoading && !isError,
});
const recentDocuments = recentSearchData?.items || [];
```

Lợi ích:
- **Chính xác:** Lấy đúng 5 tài liệu mới nhất trên toàn bộ kho học liệu (không phụ thuộc vào thứ tự chữ cái hay giới hạn 2 môn).
- **Tối ưu hiệu năng:** Giảm từ 4+ HTTP requests lồng nhau xuống còn 1 request duy nhất với phân trang và sắp xếp tại database.

---

## 4. Kế hoạch Kiểm thử & Seed dữ liệu (Verification & Seeding)

1. **Automated Unit & Integration Test:** Viết test kiểm tra số lượng tài liệu đếm được trên khoa và môn học (`backend/tests/test_library_document_counts.py`).
2. **Seed Data:** Viết script tạo dữ liệu mẫu phong phú (khoa, môn học, tài liệu công khai) cho tất cả các khoa khác (ngoại trừ Khoa Công nghệ Thông tin) để đảm bảo hệ thống hiển thị sinh động và đầy đủ số liệu thống kê.
