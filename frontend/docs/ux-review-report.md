# BÁO CÁO ĐÁNH GIÁ UI/UX & TÍNH KHẢ DỤNG HỆ THỐNG THƯ VIỆN SỐ (DIGITAL LIBRARY)

> **Người thực hiện:** Antigravity (Senior UI/UX & QA Engineer)  
> **Công cụ kiểm thử:** `agent-browser` (Chromium CDP via Accessibility Tree & Ref Snapshots)  
> **Thời gian đánh giá:** 05/11/2026  
> **Môi trường:** Localhost (`http://localhost:5173/`), Backend API (`http://127.0.0.1:8000`)  
> **Tài khoản kiểm thử:** `nguyen` (Role: Sinh viên)  
> **Thư mục ảnh chụp bằng chứng:** `frontend/docs/screenshots/`

---

## MỤC LỤC
1. [Tổng quan dự án & Phương pháp kiểm thử](#1-tổng-quan-dự-án--phương-pháp-kiểm-thử)
2. [Hành trình trải nghiệm người dùng (Walkthrough & Test Scenarios)](#2-hành-trình-trải-nghiệm-người-dùng-walkthrough--test-scenarios)
3. [Đánh giá chi tiết theo khía cạnh UX/UI](#3-đánh-giá-chi-tiết-theo-khía-cạnh-uxui)
4. [Bảng tổng hợp lỗi & Điểm nghẽn giao diện (Issue Log)](#4-bảng-tổng-hợp-lỗi--điểm-nghẽn-giao-diện-issue-log)
5. [Đề xuất cải tiến & Đoạn mã khắc phục cụ thể](#5-đề-xuất-cải-tiến--đoạn-mã-khắc-phục-cụ-thể)
6. [Kết luận & Điểm đánh giá chung](#6-kết-luận--điểm-đánh-giá-chung)

---

## 1. TỔNG QUAN DỰ ÁN & PHƯƠNG PHÁP KIỂM THỬ

Hệ thống **Thư viện số - Quản lý tài liệu (Đại học Đà Lạt)** là nền tảng quản lý tài liệu học tập, chia sẻ học liệu cộng đồng, phân quyền theo nhóm sinh viên, tích hợp trích xuất OCR và tóm tắt AI.

### Phương pháp kiểm thử tự động với `agent-browser`:
- **Accessibility-Tree Driven:** Sử dụng `agent-browser snapshot -i` để phân tích cấu trúc cây trợ năng, quét toàn bộ Interactive Elements (Buttons, Inputs, Links, Dialogs, Frames).
- **Ref Targeting:** Tương tác trực tiếp bằng ref ID (`@eN`) để kiểm chứng khả năng click, nhập liệu, tương tác phím và xử lý focus.
- **Responsiveness Check:** Thay đổi kích thước viewport linh hoạt (`Desktop 1280x800`, `Tablet 768x1024`, `Mobile 375x812`) bằng lệnh `agent-browser set viewport`.
- **Visual Capture:** Chụp ảnh màn hình từng bước tương tác lưu trữ tại `frontend/docs/screenshots/`.

---

## 2. HÀNH TRÌNH TRẢI NGHIỆM NGƯỜI DÙNG (WALKTHROUGH & TEST SCENARIOS)

| Kịch bản | Thao tác thực hiện | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :---: |
| **1. Khám phá Guest (Landing/Library)** | Truy cập `http://localhost:5173/` | Trang Kho học liệu cộng đồng hiển thị đầy đủ danh mục khoa, tìm kiếm môn học, nút Đăng nhập rõ ràng. | **ĐẠT** |
| **2. Đăng nhập hệ thống** | Nhấn "Đăng nhập", điền `nguyen` / `hash123`, nhấn "Đăng nhập" | Xác thực thành công trong < 1.5s, chuyển hướng mượt mà vào Dashboard cá nhân. | **ĐẠT** |
| **3. Khám phá Dashboard** | Xem thống kê nhanh, tài liệu gần đây, thư mục cá nhân, bảng việc cần làm | Giao diện phân bổ thẻ (Card) trực quan, hiển thị tag và thời gian truy cập rõ ràng. | **ĐẠT** |
| **4. Tạo thư mục mới** | Nhấn "Thư mục mới", mở modal, xem bảng chọn màu và gắn tag | Modal mở nhanh; tuy nhiên các nút chọn màu thiếu nhãn trợ năng. | **CẢNH BÁO** |
| **5. Tải tài liệu lên** | Nhấn "Tải tài liệu lên", kiểm tra khu vực Drag & Drop, chuyển tab Gói tài liệu | Form đầy đủ trường nhập tên, mô tả, chọn tag có sẵn hoặc tạo tag mới. Nút "Tải lên" tự disable khi chưa chọn file. | **ĐẠT** |
| **6. Quản lý nhóm học tập** | Vào "Nhóm", mở modal "Tạo nhóm mới", vào không gian nhóm "ảnh bài giảng" | Quản lý không gian nhóm rất tốt: có lọc loại file, xem tài liệu, kích hoạt tóm tắt AI. Form tạo nhóm thiếu liên kết label-input. | **CẢNH BÁO** |
| **7. Đọc & Xem tài liệu (Reader)** | Click vào tài liệu "sach tieng anh", xem PDF Viewer, tab OCR | Có PDF preview, thanh tab chuyển sang "Nội dung OCR", "Mô tả", "Ghi chú", các nút hành động (Tải xuống, Chia sẻ, Đổi tên). | **ĐẠT** |
| **8. Quản lý Nhãn dán (Tags)** | Truy cập `/tags`, kiểm tra bảng nhãn, bộ lọc trạng thái và màu sắc | Cho phép tạo nhãn nhanh với 8 màu sắc tiêu chuẩn, tìm kiếm nhãn theo tên, sửa/xóa nhãn. | **ĐẠT** |
| **9. Thống kê & Hoạt động** | Truy cập `/stats`, kiểm tra biểu đồ tương tác 30 ngày và timeline | Biểu đồ SVG/Recharts hiển thị trực quan số lượt truy cập theo ngày và lịch sử thao tác. | **ĐẠT** |
| **10. Tìm kiếm toàn văn bản** | Nhấn thanh tìm kiếm / Ctrl+K, gõ từ khóa "KTMT" | Tự động chuyển trang `/search`, kết quả rõ ràng, có gợi ý tìm kiếm. | **ĐẠT** |

---

## 3. ĐÁNH GIÁ CHI TIẾT THEO KHÍA CẠNH UX/UI

### 3.1. Điểm sáng và Ưu điểm nổi bật (Strengths)
1. **Nhận diện thương hiệu & Mỹ thuật thị giác (Visual Identity):**
   - Tông màu xanh lá chủ đạo (`primary-600` / `#16a34a`) kết hợp nền xám nhẹ (`#F7FAF7`) mang nét đặc trưng của vùng đất Đà Lạt và môi trường học thuật.
   - Typography sạch sẽ, font sans-serif dễ đọc, phân cấp tiêu đề (`h1`, `h2`, `h3`) rõ ràng.
2. **Kiến trúc thông tin (Information Architecture):**
   - Cấu trúc thanh bên (Sidebar) phân tách rành mạch 2 phạm vi: **"Phạm vi truy cập"** (Cá nhân, Nhóm, Kho học liệu) và **"Thư mục cá nhân"** (Tài liệu, Nhãn, Đã chia sẻ, Yêu thích, Thùng rác).
   - Tính năng "Thu nhỏ / Mở rộng thanh bên" (Collapsible sidebar) hoạt động trơn tru, có cập nhật state `aria-expanded` chính xác.
3. **Phản hồi người dùng (User Feedback):**
   - Các nút có loading state, nút submit tự động `disabled` khi form chưa hợp lệ.
   - Có popup thông báo (Notification bell) với badge số lượng chưa đọc, hỗ trợ "Đọc tất cả".
4. **Tính năng độc đáo:**
   - Tích hợp OCR trực tiếp vào viewer tài liệu và nút "Tóm tắt tự động AI" trên từng thẻ tài liệu tạo sự tiện lợi lớn cho sinh viên.

---

### 3.2. Điểm nghẽn trải nghiệm & Lỗi phát hiện (Weaknesses & UX Friction)

#### A. Khả năng tương tác trên thiết bị di động (Mobile Responsiveness)
* **Vấn đề che khuất nút Đóng menu (Backdrop Overlap):**
  - Khi thu nhỏ màn hình về Mobile (`375x812`), thanh menu biến thành Drawer trượt ra từ bên trái.
  - Tuy nhiên, phần tử nút overlay đóng menu (`button[aria-label="Đóng menu"]`) bị container con của Drawer đè lên ở vùng giữa màn hình. Khi người dùng click hoặc chạm vào vùng trung tâm, sự kiện click bị nuốt bởi thẻ `div` của Drawer.
  - Trong Drawer không có nút icon "X" (Close button) rõ ràng ở góc trên bên phải thanh bên mobile, khiến thao tác thoát menu trên điện thoại khó khăn.

#### B. Trợ năng & Nhãn phần tử (Accessibility - A11y)
1. **Các nút icon không có Accessible Name (`aria-label`):**
   - **Trang Đăng nhập:** Nút chuyển chế độ sáng/tối (`<Sun />`) ở góc trên màn hình auth không có `aria-label`.
   - **Ô mật khẩu:** Nút ẩn/hiện mật khẩu (`<Eye />` / `<EyeOff />`) thiếu `aria-label="Ẩn/hiện mật khẩu"`.
   - **Các Modal Popup:** Nút "X" đóng modal tại `UploadModal`, `NewFolderModal`, `CreateGroupModal` chỉ chứa icon SVG `<X />`, không có `aria-label="Đóng"`.
   - **Thẻ tài liệu / Thư mục:** Nút 3 chấm (Kebab menu options) thiếu `aria-label="Tùy chọn tài liệu"`.
   - **Bảng chọn màu thư mục:** 8 nút màu trong `NewFolderModal` không có nhãn văn bản cho trình đọc màn hình.
2. **Form Controls thiếu liên kết `label` với `input`:**
   - Tại Modal Tạo nhóm mới (`GroupList.tsx`): `<label>Tên nhóm</label>` và `<label>Mô tả</label>` không có thuộc tính `htmlFor` trỏ tới `id` của input/textarea.
   - Tại Trang Cài đặt (`SettingsPage.tsx` - Tab Hồ sơ): Trường "Tên đăng nhập" có thẻ `<label>` đứng độc lập với `<input>`, không có `id`, không có `name` hoặc `placeholder`.

#### C. Độ mơ hồ trong luồng hành động (Cognitive Load & Ambiguity)
- **Danh sách lời mời nhóm:** Trên Dashboard có 2 thông báo mời vào nhóm "nhóm cung cấp tài liệu OOP" và "nhóm bài tập thực hành". Cả 2 đều có 2 nút "Chấp nhận" và "Từ chối" nằm cạnh nhau. Nếu người dùng sử dụng phím Tab hoặc trình đọc màn hình, các nút này chỉ phát âm "Chấp nhận" / "Từ chối" mà không chỉ rõ chấp nhận lời mời của nhóm nào.

---

## 4. BẢNG TỔNG HỢP LỖI & ĐIỂM NGHẼN GIAO DIỆN (ISSUE LOG)

| Mã lỗi | Vị trí / Component | Mức độ | Mô tả chi tiết | Tác động UX / A11y |
| :---: | :--- | :---: | :--- | :--- |
| **ISSUE-01** | `MainLayout.tsx` (Mobile Drawer) | **Major** | Nút đóng overlay bị đè bởi drawer; thiếu nút "X" đóng drawer trên mobile. | Người dùng mobile khó đóng sidebar khi lỡ chạm mở menu. |
| **ISSUE-02** | `LoginPage.tsx` (Password Input) | **Minor** | Nút `<Eye>/<EyeOff>` thiếu `aria-label`. | Trình đọc màn hình báo "unnamed button". |
| **ISSUE-03** | `AuthLayout.tsx` (Header icons) | **Minor** | Nút theme `<Sun />` thiếu `aria-label`; nút ngôn ngữ là thẻ `div` có `cursor-pointer` thay vì `<button>`. | Giảm tính chuẩn mực HTML semantic và khả năng điều hướng bàn phím. |
| **ISSUE-04** | `GroupList.tsx` (Create Group Modal) | **Major** | Trường Tên nhóm và Mô tả không liên kết `htmlFor`/`id` với thẻ `label`. Nút "X" thiếu `aria-label`. | Người dùng khiếm thị không biết đang focus vào ô nhập nào. |
| **ISSUE-05** | `NewFolderModal.tsx` | **Minor** | 8 nút màu (Color pickers) hiển thị dưới dạng `button` trống không có `aria-label`. Nút "X" thiếu `aria-label`. | Không thông báo màu sắc đang chọn cho công nghệ trợ năng. |
| **ISSUE-06** | `SettingsPage.tsx` (Profile Tab) | **Minor** | Ô nhập "Tên đăng nhập" thiếu `id`, `htmlFor` và `placeholder`. | Trình duyệt không thể tự gợi ý autocomplete và thiếu accessible label. |
| **ISSUE-07** | `PersonalWorkspace.tsx` / `GroupSpace` | **Minor** | Nút 3 chấm menu trên card tài liệu và thư mục là icon thuần, không có `aria-label`. | Không phân biệt được nút hành động thuộc tài liệu nào trong cây trợ năng. |
| **ISSUE-08** | `Dashboard.tsx` (Thông báo mời nhóm) | **Minor** | Nút "Chấp nhận" / "Từ chối" lặp lại thiếu context nhóm cụ thể. | Dễ bấm nhầm chấp nhận nhóm không mong muốn nếu dùng bàn phím duyệt nhanh. |

---

## 5. ĐỀ XUẤT CẢI TIẾN & ĐOẠN MÃ KHẮC PHỤC CỤ THỂ

### 5.1. Khắc phục Mobile Drawer Navigation (`MainLayout.tsx`)
**Hiện trạng:**
```tsx
{isSidebarOpen && (
  <div className="fixed inset-0 z-50 md:hidden">
    <button
      type="button"
      aria-label="Đóng menu"
      className="absolute inset-0 bg-gray-900/40"
      onClick={() => setIsSidebarOpen(false)}
    />
    <div className="relative h-full w-[260px] bg-white shadow-xl">
      <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
    </div>
  </div>
)}
```
**Khắc phục đề xuất:** Thêm nút đóng rõ ràng bên trong Drawer và xử lý backdrop tách biệt:
```tsx
{isSidebarOpen && (
  <div className="fixed inset-0 z-50 flex md:hidden">
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity"
      onClick={() => setIsSidebarOpen(false)}
      aria-hidden="true"
    />
    {/* Drawer container */}
    <div className="relative flex h-full w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl z-10">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <span className="font-semibold text-gray-900">Menu</span>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Đóng thanh điều hướng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
      </div>
    </div>
  </div>
)}
```

---

### 5.2. Khắc phục Form Accessibility tại `GroupList.tsx`
**Khắc phục đề xuất:**
```tsx
<div>
  <label htmlFor="group-name-input" className="mb-1 block text-sm font-medium text-gray-700">
    Tên nhóm <span className="text-red-500">*</span>
  </label>
  <Input
    id="group-name-input"
    placeholder="Nhập tên nhóm học tập..."
    value={name}
    onChange={(event) => setName(event.target.value)}
    required
  />
</div>
<div>
  <label htmlFor="group-desc-input" className="mb-1 block text-sm font-medium text-gray-700">
    Mô tả
  </label>
  <textarea
    id="group-desc-input"
    placeholder="Nhập mục đích hoặc quy định của nhóm..."
    className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-600"
    value={description}
    onChange={(event) => setDescription(event.target.value)}
  />
</div>
```

---

### 5.3. Khắc phục nút Icon & Mật khẩu tại `LoginPage.tsx`
**Khắc phục đề xuất:**
```tsx
<button
  type="button"
  onClick={() => setShowPassword(v => !v)}
  className="p-1 hover:text-gray-700 focus:outline-none focus-visible:ring-2 rounded-sm"
  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
  title={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
>
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button>
```

---

### 5.4. Khắc phục thẻ chọn màu tại `NewFolderModal.tsx`
**Khắc phục đề xuất:**
Gán `aria-label={`Màu ${colorName}`}` và `aria-pressed={selectedColor === color}` cho từng nút màu để người dùng sử dụng phím hoặc VoiceOver có thể nhận biết trực quan.

---

## 6. KẾT LUẬN & ĐIỂM ĐÁNH GIÁ CHUNG

| Tiêu chí đánh giá | Điểm số (1-10) | Nhận xét chuyên gia |
| :--- | :---: | :--- |
| **Giao diện & Mỹ thuật (UI & Aesthetics)** | **9.0 / 10** | Thiết kế rất đồng bộ, chuyên nghiệp, chuẩn mực học thuật hiện đại. Phối màu hài hòa, thư viện icon rõ ràng. |
| **Trải nghiệm người dùng (UX Flows)** | **8.5 / 10** | Luồng thao tác từ Đăng nhập -> Xem tài liệu -> Ghi chú/OCR -> Tạo nhóm rất thông suốt, thời gian tải nhanh. |
| **Tính tương thích thiết bị (Responsiveness)** | **7.8 / 10** | Tablet và Desktop hoàn hảo. Mobile hoạt động tốt với dạng lưới co giãn nhưng cần tinh chỉnh thanh Drawer. |
| **Khả năng tiếp cận & Trợ năng (A11y)** | **7.0 / 10** | Cần bổ sung `aria-label` cho các nút icon và liên kết thuộc tính `htmlFor`/`id` cho các ô nhập liệu. |
| **TỔNG KẾT TOÀN DIỆN** | **8.2 / 10** | **ĐẠT TIÊU CHUẨN XUẤT SẮC ĐỂ ĐƯA VÀO SỬ DỤNG THỰC TẾ**, chỉ cần áp dụng một số tinh chỉnh A11y & Mobile nhẹ. |

---
*Báo cáo được hoàn thành tự động với hỗ trợ từ Antigravity và `agent-browser` CLI.*
