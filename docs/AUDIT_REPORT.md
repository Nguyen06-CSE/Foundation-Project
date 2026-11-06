---
id: AUDIT_REPORT
title: Audit Report
sidebar_position: 4
---

# Báo cáo kiểm toán ứng dụng Thư viện số

**Ngày kiểm tra:** 03/11/2026  
**Địa chỉ:** `http://localhost:5174/`  
**Tài khoản kiểm tra:** `nguyen` (Sinh viên)  
**Phạm vi:** Kiểm tra giao diện và thao tác an toàn trên ứng dụng đang chạy; xem xét source frontend/backend liên quan đến phiên đăng nhập và phân quyền. Không sửa source code, cấu hình hoặc dữ liệu.

## 1. Tóm tắt

Đăng nhập bằng tài khoản mẫu thành công. Dashboard, tài liệu cá nhân, nhóm, không gian nhóm, thống kê, cài đặt và thùng rác cá nhân/nhóm đã được mở. Một số thao tác chỉ đọc (mở tab, chuyển trang, xem dữ liệu) đã thực hiện.

Phát hiện xác nhận rõ nhất ở giao diện là hai mục **Đã chia sẻ với tôi** và **Yêu thích** chỉ hiện “Trang đang xây dựng”. Đây là chức năng chưa được triển khai cho người dùng, không phải lỗi API đã xác minh. Ngoài ra, access token được lưu trong `localStorage` theo source code, khiến token có thể bị lấy nếu xảy ra XSS. Chưa có bằng chứng về XSS thực tế.

Đây là audit một phiên và một vai trò, không phải xác nhận toàn bộ chức năng. Không thử tạo, cập nhật, xóa, upload, mời thành viên, gửi yêu cầu, đóng góp học liệu hay thay đổi mật khẩu. Những thao tác này có thể ghi dữ liệu và dùng chung môi trường mẫu.

## 2. Module và phạm vi đã kiểm tra

| Module | Kết quả kiểm tra thực tế |
|---|---|
| Kho học liệu cộng đồng `/library` | Mở được; khi tải dữ liệu xong hiển thị 15 khoa, 18 môn học, 0 tài liệu công khai. Chưa mở từng khoa/môn hoặc thử tìm kiếm. |
| Đăng nhập `/login` | Đăng nhập mẫu thành công, chuyển tới `/personal`. |
| Dashboard cá nhân `/personal` | Mở được; thống kê nhanh, tài liệu gần đây, thư mục, nhóm, hoạt động hiển thị. |
| Tài liệu cá nhân `/personal/documents` | Mở được; tìm kiếm/lọc/đổi kiểu xem có mặt; hiện 9 mục trên 2 trang. Không thực hiện thao tác chỉnh sửa. |
| Đã chia sẻ `/personal/shared` | Hiện “Trang đang xây dựng”. |
| Yêu thích `/personal/favorites` | Hiện “Trang đang xây dựng”. |
| Thùng rác cá nhân `/personal/trash` | Hiển thị 3 mục trong 2 ngày xóa, tổng 1.43 MB và tùy chọn khôi phục/xóa; không thao tác. |
| Danh sách nhóm `/groups` | Hiển thị một nhóm “ảnh bài giảng”, 2 thành viên; tài khoản kiểm tra là trưởng nhóm. |
| Không gian nhóm `/groups/22` | Tài liệu, thành viên, yêu cầu, cài đặt và thùng rác đã mở ở chế độ xem. Có 2 tệp hiển thị trong tab tài liệu. |
| Thùng rác nhóm | Hiển thị một nhóm xóa, 188.32 KB; dòng dữ liệu có nhãn “Kho cá nhân” — xem nghi vấn AUD-04. |
| Thống kê `/stats` | Sau khi tải xong hiển thị biểu đồ 30 ngày, 20 hoạt động gần nhất; số liệu khác dashboard — xem AUD-05. |
| Cài đặt `/settings` | Mở trang thông tin tài khoản; tab bảo mật cho thấy biểu mẫu đổi mật khẩu, có yêu cầu tối thiểu 8 ký tự. Không gửi biểu mẫu. |
| Tìm kiếm, lớp, khoa/trường, trang quản trị, chi tiết tài liệu | Chưa hoàn tất kiểm thử tương tác. Một số route được thấy trong cấu hình ứng dụng nhưng chưa được xác minh với tài khoản sinh viên. |

## 3. Danh sách phát hiện

### AUD-01 — Trang “Đã chia sẻ với tôi” chưa được triển khai

- **Module:** Cá nhân → Đã chia sẻ với tôi (`/personal/shared`)
- **Các bước tái hiện:** Đăng nhập bằng `nguyen` → chọn “Đã chia sẻ với tôi” trên sidebar.
- **Thực tế:** Trang chỉ hiện dòng “Trang đang xây dựng”, không có nội dung, trạng thái rỗng hoặc hướng dẫn.
- **Mong đợi:** Danh sách tài liệu được chia sẻ, trạng thái rỗng có giải thích, hoặc thông báo chức năng chưa khả dụng có chủ đích.
- **Nguyên nhân dự kiến:** Trang chưa được nối vào giao diện nghiệp vụ.
- **Mức độ:** **Medium** — một mục điều hướng chính không cung cấp chức năng.
- **Khắc phục:** Hoàn thiện danh sách và trạng thái rỗng; nếu chưa có trong phạm vi phát hành thì ẩn/đánh dấu mục này và cập nhật tài liệu sản phẩm.
- **Bằng chứng:** Snapshot trợ năng sau khi mở route ghi nhận chính xác “Trang đang xây dựng”.

### AUD-02 — Trang “Yêu thích” chưa được triển khai

- **Module:** Cá nhân → Yêu thích (`/personal/favorites`)
- **Các bước tái hiện:** Đăng nhập bằng `nguyen` → chọn “Yêu thích”.
- **Thực tế:** Trang chỉ hiện “Trang đang xây dựng”; không thể xem tài liệu đã đánh dấu. Dashboard báo 0 tài liệu yêu thích.
- **Mong đợi:** Danh sách yêu thích hoặc trạng thái rỗng có khả năng dẫn đến tài liệu; thao tác thêm/bỏ yêu thích nên được xác minh riêng.
- **Nguyên nhân dự kiến:** Màn hình chưa được triển khai hoặc kết nối dữ liệu.
- **Mức độ:** **Medium** — tính năng được quảng bá trong sidebar nhưng không sử dụng được.
- **Khắc phục:** Hoàn thiện màn hình và xác minh đồng bộ với thao tác đánh dấu yêu thích ở danh sách tài liệu.
- **Bằng chứng:** Snapshot trợ năng của route ghi “Trang đang xây dựng”.

### AUD-03 — Access token lưu trong `localStorage` làm tăng tác động nếu có XSS

- **Module:** Authentication/session (frontend)
- **Các bước tái hiện:** Xem source `digital-library/src/stores/authStore.ts`; Zustand persist lưu `token` vào storage với khóa `auth-storage`. `digital-library/src/services/api.ts` gắn token vào header `Authorization`.
- **Thực tế:** Token bearer được lưu bền trong `localStorage`; mã JavaScript cùng origin có thể đọc được. Không xác nhận có lỗ hổng XSS thực tế trong lần audit này.
- **Mong đợi:** Giảm khả năng truy cập token từ JavaScript tùy kiến trúc triển khai (ví dụ cookie `HttpOnly`, `Secure`, `SameSite` và biện pháp CSRF tương ứng), đồng thời áp dụng CSP và kiểm soát đầu vào/đầu ra.
- **Nguyên nhân dự kiến:** Cách triển khai phiên ưu tiên thuận tiện cho SPA.
- **Mức độ:** **Medium (rủi ro thiết kế, chưa khai thác)**.
- **Khắc phục:** Đánh giá chuyển sang cookie `HttpOnly` hoặc cơ chế token ngắn hạn trong bộ nhớ; rà soát XSS đầu vào/đầu ra, CSP và quy trình thu hồi token. Cân nhắc thời hạn JWT 24 giờ theo `backend/app/core/security.py`.
- **Bằng chứng:** Source lưu `token` trong Zustand `persist`; backend cấp access token thời hạn 24 giờ. Không có thử nghiệm khai thác.

### AUD-04 — Nhãn nguồn “Kho cá nhân” xuất hiện trong thùng rác nhóm

- **Module:** Nhóm → Thùng rác (`/groups/22?tab=trash`)
- **Các bước tái hiện:** Mở nhóm “ảnh bài giảng” → tab “Thùng rác”.
- **Thực tế:** Bảng thuộc thùng rác nhóm hiển thị một nhóm xóa nhưng chú thích nguồn là “Kho cá nhân”.
- **Mong đợi:** Nhãn nguồn phản ánh đúng phạm vi chứa tài liệu đã xóa, hoặc không hiển thị nhãn cá nhân trong ngữ cảnh nhóm.
- **Nguyên nhân dự kiến:** Nhãn dùng chung giữa hai màn hình hoặc ánh xạ nguồn dữ liệu chưa đúng. Chưa xác minh bản ghi phía API/DB nên đây là nghi vấn.
- **Mức độ:** **Low (nghi vấn)**.
- **Khắc phục:** Đối chiếu bản ghi trash và response API của nhóm 22; xác nhận ngữ nghĩa trường nguồn trước khi sửa nhãn.
- **Bằng chứng:** Snapshot route nhóm ghi `Thùng rác nhóm`, một tài liệu, đồng thời hàng ngày có nhãn “Kho cá nhân”.

### AUD-05 — Số tổng tài liệu dashboard khác số “đã tải lên” ở thống kê

- **Module:** Dashboard cá nhân và Thống kê
- **Các bước tái hiện:** So sánh “Tổng tài liệu” ở `/personal` với “Tài liệu đã tải lên” ở `/stats`.
- **Thực tế:** Dashboard hiển thị 9 tổng tài liệu; thống kê hiển thị 16 tài liệu đã tải lên. Danh sách tài liệu cá nhân hiện 9 mục.
- **Mong đợi:** Các con số cần có nhãn/định nghĩa rõ ràng và khớp nhau khi cùng chỉ một tập dữ liệu.
- **Nguyên nhân dự kiến:** Có thể hai số dùng phạm vi khác nhau (ví dụ gồm tài liệu nhóm, đã xóa, gói tài liệu hoặc lịch sử tải lên). Chưa đối chiếu hợp đồng API nên chưa kết luận là sai nghiệp vụ.
- **Mức độ:** **Low (nghi vấn về tính nhất quán)**.
- **Khắc phục:** Ghi rõ định nghĩa từng chỉ số; đối chiếu response dashboard/stats và dữ liệu mẫu; thêm kiểm thử nhất quán cho cùng phạm vi.
- **Bằng chứng:** Snapshot giao diện ghi nhận 9 ở dashboard, 16 ở thống kê, 9 mục trong trang danh sách.

## 4. Đánh giá UI/UX

- Khung điều hướng desktop rõ ràng, tên tài khoản và vai trò hiển thị; dashboard có lối tắt, nhóm, thư mục và lịch sử hoạt động.
- Trang tài liệu có tab loại, filter, sắp xếp, folder, 3 chế độ xem và phân trang; tài liệu mẫu hiển thị preview/text trích xuất.
- Thùng rác trình bày thời hạn tự xóa, dung lượng và hành động theo ngày. Vì hành động khôi phục/xóa có tác động dữ liệu nên không thử.
- “Đã chia sẻ với tôi” và “Yêu thích” nằm trong sidebar nhưng chỉ có placeholder, tạo cảm giác chức năng hỏng/chưa hoàn thiện.
- Chưa đánh giá responsive trên nhiều kích thước viewport, bàn phím/keyboard-only, tương phản màu, trình đọc màn hình bằng thao tác chuyên biệt hoặc ảnh chụp so với file thiết kế.

## 5. Đánh giá bảo mật

- **Đã xác minh ở source:** Token lưu trong `localStorage`; backend dùng JWT HS256 và thời hạn token 24 giờ. Đây là rủi ro tăng tác động khi có XSS, không phải bằng chứng XSS.
- **Đăng nhập:** Tài khoản mẫu xác thực thành công. Luồng đăng xuất có nút, nhưng chưa bấm để tránh thay đổi phiên người dùng đang hoạt động.
- **Authorization:** Source frontend có `ProtectedRoute` giới hạn một số route theo role. Điều này không thay thế kiểm tra quyền ở backend. Chưa dùng token sinh viên để gọi trực tiếp endpoint quản trị hoặc truy cập chéo dữ liệu, do cần xác định phạm vi và dữ liệu kiểm thử an toàn.
- **XSS/CSRF/SQL injection:** Không thực hiện payload khai thác. Chưa có đủ bằng chứng để kết luận an toàn/vulnerable ở các nhóm này.
- **Thông tin đăng nhập mẫu:** Tài khoản/mật khẩu đơn giản chỉ phù hợp môi trường demo; cần xác nhận không được tái sử dụng trong triển khai thật.
- **CORS:** Source backend chỉ định danh sách origin cụ thể và bật credentials; chưa kiểm tra bằng request thực tế.

## 6. Đánh giá API, hiệu năng và nghiệp vụ

- Đăng nhập và tải dữ liệu cho dashboard, thư viện, danh sách tài liệu, nhóm, thống kê, cài đặt và thùng rác đã hoạt động đủ để giao diện hiển thị dữ liệu.
- Chưa thu được bảng Network có status, kích thước và thời gian từng request; công cụ trình duyệt trong phiên này không cung cấp DevTools Network/Performance/Lighthouse. Không suy diễn SLA hoặc hiệu năng từ thời gian nhìn bằng mắt.
- Dashboard/library đôi lúc cần chờ tải dữ liệu sau điều hướng; sau khi hoàn tất, dữ liệu xuất hiện. Không có số đo thời gian chính xác.
- CRUD, upload/download, validation dữ liệu bất thường, phân trang thao tác, lọc/tìm kiếm, phân quyền chéo vai trò, khôi phục/xóa dữ liệu và đóng góp cộng đồng chưa được xác minh đầy đủ.
- Không chạy Lighthouse và không dùng DevTools Sources/Application để trích xuất storage/token.

## 7. Bảng mức độ

| Mức độ | Số lượng | Mã |
|---|---:|---|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 3 | AUD-01, AUD-02, AUD-03 |
| Low | 2 | AUD-04, AUD-05 (cả hai là nghi vấn cần đối chiếu) |

## 8. Lộ trình khắc phục đề xuất

1. Hoàn thiện hoặc ẩn hai mục “Đã chia sẻ với tôi” và “Yêu thích”; kiểm tra đồng bộ thao tác đánh dấu yêu thích và chia sẻ.
2. Rà soát chiến lược phiên/token, thời hạn JWT và phòng chống XSS; xác nhận mọi endpoint kiểm tra quyền ở backend.
3. Đối chiếu thùng rác nhóm với response API để xác minh nhãn “Kho cá nhân”.
4. Thống nhất định nghĩa chỉ số dashboard/thống kê và làm rõ phạm vi trên giao diện.
5. Chạy vòng kiểm thử tiếp theo khi có dữ liệu test riêng: tìm kiếm/lọc/phân trang, preview/download, upload file benign, CRUD có thể khôi phục, xác minh role student/teacher/admin và kiểm tra request Network.
6. Bổ sung kiểm tra viewport di động, accessibility, Console, Performance và Lighthouse bằng DevTools khi có thể truy cập.

## 9. Hạn chế và trạng thái

Audit hoàn tất ở mức kiểm tra đọc và tương tác không phá hủy cho một tài khoản sinh viên. Không xóa/sửa/khôi phục dữ liệu, không upload hoặc gửi lời mời, không thay đổi cài đặt/mật khẩu, không kiểm thử payload bảo mật. Các điểm ghi là “nghi vấn” cần xác minh với API/dữ liệu trước khi xem là lỗi đã xác nhận.
