# AGENTS.md — Hướng dẫn cho AI Agent

## 1. Tổng quan dự án
Hệ thống Thư viện số Quản lý Tài liệu — đồ án cơ sở, Đại học Đà Lạt.
Web app cho phép sinh viên/giảng viên lưu trữ, chia sẻ tài liệu học tập
theo 5 không gian: Cá nhân, Nhóm, Lớp, Khoa, Trường.

## 2. Tech stack (KHÔNG được tự ý đổi)
- React 18 + Vite + TypeScript (strict mode)
- TailwindCSS (dùng theme trong `tailwind.config.ts`, KHÔNG hardcode màu hex trong className)
- react-router-dom (routing)
- @tanstack/react-query (gọi API, cache)
- zustand (global state: auth, notifications)
- lucide-react (icon — KHÔNG dùng thư viện icon khác)
- recharts (biểu đồ)
- axios (HTTP client)

## 3. Quy tắc bắt buộc trước khi code bất kỳ trang/component nào
1. Đọc `docs/DESIGN_SYSTEM.md` trước — mọi màu sắc, spacing, radius, font PHẢI lấy từ đây.
2. Đọc `docs/COMPONENTS.md` — kiểm tra component cần dùng đã tồn tại chưa trước khi tạo mới.
3. Đọc `docs/SCREENS.md` — xác định đúng route/file cần sửa.
4. Nếu có ảnh tham chiếu trong `docs/design-reference/`, PHẢI bám sát bố cục, khoảng cách,
   thứ tự phần tử trong ảnh — không tự sáng tạo layout khác.

## 4. Quy trình làm việc (flow bắt buộc)
1. **Giai đoạn A — Component nền tảng**: chỉ tạo trong `src/components/ui/` và
   `src/components/shared/`. KHÔNG viết logic nghiệp vụ, KHÔNG gọi API ở giai đoạn này.
2. **Giai đoạn B — Trang với mock data**: dùng data giả trong `src/mocks/`,
   IMPORT component có sẵn, không viết lại UI đã có.
3. **Giai đoạn C — UI/UX polish**: loading state, empty state, responsive, animation.
4. **Giai đoạn D — Kết nối API thật**: chỉ làm khi được yêu cầu rõ ràng, thay `mocks/`
   bằng `services/`, giữ nguyên UI đã duyệt.

KHÔNG được nhảy cóc giai đoạn (VD: không tự ý gọi API khi task chỉ yêu cầu dựng giao diện).

## 5. Quy tắc code
- Mỗi component 1 file, PascalCase, export default.
- Props luôn định nghĩa `interface XxxProps` ngay trong file, KHÔNG dùng `any`.
- Không tạo component "God file" — nếu 1 trang > 200 dòng, tách nhỏ thành sub-component
  trong cùng thư mục `pages/xxx/components/`.
- Dùng `clsx` + `tailwind-merge` khi cần className động, KHÔNG nối chuỗi thủ công.
- Sau khi tạo/sửa file, LUÔN chạy `npm run build` hoặc `npm run dev` để tự kiểm tra lỗi
  cú pháp/TypeScript trước khi báo hoàn thành.

## 6. Phạm vi mỗi lần thực hiện
- Chỉ làm ĐÚNG những gì được yêu cầu trong prompt hiện tại.
- Nếu phát hiện việc cần làm thêm (VD: thiếu icon, thiếu type), hỏi lại thay vì tự ý mở rộng phạm vi.
- Không tự động refactor code không liên quan đến task đang làm.

## 7. Tài liệu tham khảo bắt buộc đọc theo thứ tự
1. docs/DESIGN_SYSTEM.md
2. docs/COMPONENTS.md
3. docs/SCREENS.md
4. docs/design-reference/*.png (ảnh tương ứng với trang đang làm)