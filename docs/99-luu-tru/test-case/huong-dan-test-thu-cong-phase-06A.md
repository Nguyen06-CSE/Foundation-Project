# Hướng Dẫn Chi Tiết Các Bước Test Thủ Công Trên Trình Duyệt (Browser Manual Testing Guide)
## Phase 6A: Sáu Chức Năng AI & Preview Danh Sách Tài Liệu

> **Mục tiêu**: Cung cấp tài liệu hướng dẫn từng bước (step-by-step) để lập trình viên hoặc tester có thể tự kiểm thử thủ công toàn bộ các tính năng AI và phân quyền trên giao diện webapp thư viện số.

---

## 1. Chuẩn Bị Môi Trường Trước Khi Test

### 1.1 Khởi động các dịch vụ
1. **Cơ sở dữ liệu (PostgreSQL với pgvector & unaccent)**:
   - Đảm bảo container PostgreSQL test hoặc DB cục bộ đang chạy.
   - Ví dụ port: `55434` (hoặc cấu hình trong `.env`).
2. **Khởi động Backend (FastAPI)**:
   ```bash
   cd /Users/caotiendattx/Developer/Foundation-Project
   PYTHONPATH=backend .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - Kiểm tra API Docs tại: `http://localhost:8000/docs`
3. **Khởi động Frontend (React Vite)**:
   ```bash
   cd /Users/caotiendattx/Developer/Foundation-Project/frontend/digital-library
   npm run dev
   ```
   - Mở trình duyệt truy cập: `http://localhost:5173`

### 1.2 Danh sách tài khoản thử nghiệm
Chuẩn bị sẵn 3 tài khoản với các vai trò khác nhau (có thể đăng ký trực tiếp qua giao diện `/login` hoặc dùng tài khoản seed):

| Tài khoản | Username / Email | Mật khẩu | Vai trò trong kịch bản |
|:---|:---|:---|:---|
| **User A** (Alice) | `alice` / `alice@example.com` | `Password@123` | Chủ sở hữu (Owner) tài liệu cá nhân & Trưởng nhóm Workspace 10 |
| **User B** (Bob) | `bob` / `bob@example.com` | `Password@123` | Thành viên nhóm Workspace 10 (Quyền xem: `view-only`) |
| **User C** (Carol) | `carol` / `carol@example.com` | `Password@123` | Người ngoài nhóm (Outsider - không có quan hệ với Workspace 10) |

---

## 2. Các Bước Kiểm Thử Chi Tiết Từng Tính Năng

---

### PHẦN 1: Tải Lên, Lập Chỉ Mục (Index) & Preview Danh Sách Tài Liệu

#### Bước 1.1: Tải lên tài liệu vào Kho cá nhân
1. Đăng nhập bằng tài khoản **Alice**.
2. Trên thanh điều hướng bên trái, bấm vào **Tài liệu của tôi** (`/personal/documents`).
3. Bấm nút **Tải lên tài liệu** (Upload).
4. Chọn một file tài liệu từ máy (PDF, DOCX hoặc Markdown, ví dụ: file trong `backend/storage/11/ab2f7a527f3f47fdbfff12f4a8cf7504.md`).
5. Điền tiêu đề: `Giáo trình Cấu trúc dữ liệu và giải thuật`, chọn môn học (nếu có).
6. Bấm **Xác nhận tải lên**.
   - **Kỳ vọng**: File tải lên thành công, xuất hiện thông báo toast xanh "Tải lên thành công".
   - Tài liệu xuất hiện trong danh sách với trạng thái chỉ mục: chuyển từ `Đang xử lý` sang `Sẵn sàng` (Ready).

#### Bước 1.2: Kiểm tra Preview danh sách (Network DevTools)
1. Mở công cụ nhà phát triển trên trình duyệt (**F12** hoặc `Ctrl+Shift+I` / `Cmd+Option+I`), chuyển sang tab **Network**.
2. F5 tải lại trang `/personal/documents`.
3. Tìm request `GET /api/v1/documents?...` (hoặc `GET /documents`).
4. Bấm vào request, xem tab **Response**:
   - **Kỳ vọng**:
     - Mỗi phần tử trong mảng `items` **KHÔNG** chứa trường `content` (giúp danh sách tải siêu nhanh).
     - Mỗi phần tử có trường `preview_text` chứa đoạn trích mở đầu ngắn gọn ($\le 400$ ký tự).
     - Với tài liệu rỗng hoặc chưa lập chỉ mục, `preview_text` là `null` và hiển thị placeholder thích hợp trên card tài liệu.

#### Bước 1.3: Thử nghiệm tải lên tài liệu thiếu nội dung / File rỗng
1. Bấm nút **Tải lên tài liệu**.
2. Chọn một file text hoặc PDF rỗng 0 KB.
3. Bấm **Xác nhận tải lên**.
   - **Kỳ vọng**: Giao diện hiển thị thông báo lỗi rõ ràng: *"Tệp tải lên rỗng hoặc không có nội dung văn bản để lập chỉ mục"*. Hệ thống không bị treo hoặc sập màn hình trắng.

---

### PHẦN 2: Tìm Kiếm Kết Hợp (Hybrid Search) & Nhãn Phương Thức

Chuyển sang trang **Tìm kiếm** (`/search`) trên thanh menu hoặc thanh tìm kiếm ở đầu trang.

#### Bước 2.1: Tìm kiếm từ khóa chính xác (Lexical Search)
1. Nhập vào ô tìm kiếm cụm từ: `khóa chính` (hoặc một từ khóa đặc thù có trong tài liệu của bạn).
2. Bấm **Enter** hoặc nút Kính lúp.
   - **Kỳ vọng**:
     - Tài liệu chứa từ khóa xuất hiện ở vị trí đầu tiên.
     - Trên card kết quả có hiển thị nhãn (badge) phương thức: **"Từ khóa"** hoặc **`lexical_content`**.
     - Bấm nút **"Xem đoạn trích"** (hoặc mở rộng): hiển thị đoạn văn chứa từ khóa được highlight.

#### Bước 2.2: Tìm kiếm ngữ nghĩa / Diễn đạt lại (Semantic Search)
1. Nhập vào ô tìm kiếm câu diễn đạt lại ý nghĩa (không trùng từng chữ với tiêu đề), ví dụ: `khuôn mẫu tạo container` hoặc `nhánh phải của cây nhị phân`.
2. Bấm **Enter**.
   - **Kỳ vọng**:
     - Hệ thống vẫn tìm ra đúng tài liệu nói về Docker hoặc Cây tìm kiếm nhị phân nhờ vector embedding.
     - Trên card kết quả xuất hiện nhãn phương thức: **"Ngữ nghĩa"** hoặc **`semantic`**.

#### Bước 2.3: Tìm kiếm tiếng Việt không dấu (Unaccent Search)
1. Nhập vào ô tìm kiếm phiên bản không dấu: `khuon mau tao moi truong container`.
2. Bấm **Enter**.
   - **Kỳ vọng**: Hệ thống tự động chuẩn hóa qua `unaccent` và trả về kết quả chính xác giống như khi gõ có dấu.

---

### PHẦN 3: Hỏi Đáp Trích Nguyên Văn Có Dẫn Nguồn (Document Q&A)

Từ danh sách tài liệu cá nhân, bấm vào tài liệu `Giáo trình Cấu trúc dữ liệu và giải thuật` để mở trang chi tiết (`/personal/documents/{id}`).

#### Bước 3.1: Đặt câu hỏi có căn cứ trong tài liệu
1. Trong trang chi tiết tài liệu, chuyển sang tab **Hỏi đáp AI** (hoặc tab **Hỏi đáp / Insights**).
2. Nhập câu hỏi có nội dung nằm trong tài liệu:
   *Ví dụ*: `Trong cây tìm kiếm nhị phân, giá trị lớn nhất nằm ở đâu?`
3. Bấm nút **Gửi câu hỏi** (hoặc bấm Enter).
   - **Kỳ vọng**:
     - Hệ thống trả lời chính xác, trích nguyên văn: *"Trong cây tìm kiếm nhị phân, giá trị lớn nhất nằm ở nhánh phải."*
     - Có khung dẫn nguồn (Citation) ghi rõ: *Đoạn #1* kèm tiêu đề mục tương ứng.
     - Bấm vào citation: cuộn tới hoặc highlight đoạn văn nguồn tương ứng.

#### Bước 3.2: Thử thách phân biệt khái niệm chặt chẽ
1. Nhập câu hỏi so sánh: `Cây nhị phân và cây tìm kiếm nhị phân khác nhau thế nào?`
2. Bấm **Gửi câu hỏi**.
   - **Kỳ vọng**: Câu trả lời chỉ đưa ra thông tin có trong tài liệu, bảo toàn điều kiện "cây tìm kiếm nhị phân", không tự suy diễn lung tung.

#### Bước 3.3: Đặt câu hỏi không có căn cứ trong tài liệu (Anti-Hallucination)
1. Nhập một câu hỏi hoàn toàn không liên quan đến tài liệu:
   *Ví dụ*: `Cơ sở dữ liệu này được phát minh vào năm bao nhiêu?` hoặc `Ai là người sáng lập công ty ABC?`
2. Bấm **Gửi câu hỏi**.
   - **Kỳ vọng**:
     - Hệ thống trả về trạng thái: *"Không đủ căn cứ trong tài liệu để trả lời"* (hoặc *"Tài liệu không đề cập đến thông tin này"*).
     - Không có câu trả lời bịa đặt (hallucination).
     - Danh sách citation rỗng.

---

### PHẦN 4: Tóm Tắt Nội Dung (Summary) & Đồng Bộ Preview

Vẫn ở trang chi tiết tài liệu (`/personal/documents/{id}`):

#### Bước 4.1: Tạo tóm tắt nội dung tài liệu
1. Chuyển sang tab **Tóm tắt AI** (hoặc tab **Thông tin / Tóm tắt**).
2. Bấm nút **"Tạo tóm tắt AI"** (hoặc nút **"Tạo tóm tắt"**).
   - **Kỳ vọng**:
     - Xuất hiện biểu tượng loading quay trong giây lát.
     - Hiển thị bản tóm tắt gồm các ý gạch đầu dòng ngắn gọn, súc tích trích xuất từ các đoạn quan trọng của tài liệu.

#### Bước 4.2: Kiểm tra bộ đệm (Cache)
1. Nhấn **F5** (Reload trang) hoặc chuyển sang tab khác rồi quay lại tab Tóm tắt.
   - **Kỳ vọng**: Nội dung tóm tắt hiển thị ngay lập tức mà không cần gọi AI tính toán lại (Cache hit).

#### Bước 4.3: Kiểm tra tính toàn vẹn của mô tả thủ công
1. Kiểm tra phần **Mô tả tài liệu** (Description do người dùng tự nhập khi upload).
   - **Kỳ vọng**: Mô tả thủ công ban đầu của bạn **không bị ghi đè** hay bị thay thế bằng tóm tắt AI.

#### Bước 4.4: Kiểm tra cập nhật Preview tại danh sách tài liệu
1. Bấm nút quay lại **Tài liệu của tôi** (`/personal/documents`).
2. Quan sát card của tài liệu vừa được tóm tắt.
   - **Kỳ vọng**: `preview_text` trên card bây giờ tự động ưu tiên hiển thị nội dung tóm tắt vừa tạo, giúp người đọc nắm nhanh ý chính mà không cần mở file.

---

### PHẦN 5: Gợi Ý Tag Có Sẵn & Tạo Tag Mới

Vẫn với tài khoản **Alice**:

#### Bước 5.1: Mở gợi ý Tag cho tài liệu cá nhân
1. Vào trang chi tiết tài liệu Doc 1.
2. Tìm đến khu vực **Nhãn (Tags)**, bấm nút **"Gợi ý tag"** (hoặc icon tia sét / Sparkles).
   - **Kỳ vọng**:
     - Modal hoặc dropdown gợi ý mở ra mà không gặp lỗi (đã khắc phục dứt điểm `BUG-AI-01`).
     - Mục **Tag có sẵn**: Hiển thị các tag đã có trong hệ thống xuất hiện trong nội dung (ví dụ: `Cấu trúc dữ liệu`). Các tag đã được gắn trước đó (ví dụ: `Cơ sở dữ liệu`) **không xuất hiện lại**.
     - Mục **Tag gợi ý mới**: Hiển thị các từ khóa đề xuất từ tiêu đề đoạn (heading), ví dụ: `Cấu trúc cây`.

#### Bước 5.2: Gắn tag có sẵn và tạo tag mới
1. Bấm chọn tag có sẵn `Cấu trúc dữ liệu` -> Tag được thêm vào tài liệu.
2. Tại mục tag mới, bấm vào gợi ý `Cấu trúc cây`, chỉnh sửa tên thành `Cây nhị phân` rồi bấm **Lưu/Xác nhận**.
   - **Kỳ vọng**: Tag mới được tạo và gắn thành công vào tài liệu.

#### Bước 5.3: Kiểm tra hành động Hủy (Cancel)
1. Bấm lại nút **Gợi ý tag**.
2. Chọn một tag nhưng bấm nút **"Bỏ qua / Hủy"** (hoặc bấm dấu X).
   - **Kỳ vọng**: Không có tag mới nào được lưu thêm vào tài liệu.

#### Bước 5.4: Kiểm tra gợi ý Tag trên tài liệu nhóm (Workspace)
1. Vào menu **Nhóm** (`/groups`), chọn nhóm **Nghiên cứu KTPM** (Workspace 10).
2. Bấm vào tài liệu nhóm (Doc 2: *Quy trình Scrum và DevOps*).
3. Bấm **Gợi ý tag**.
   - **Kỳ vọng**: Hiển thị đúng các tag của nhóm và các tag được chia sẻ qua `workspace_tags` (ví dụ: `DevOps`). Tag cá nhân của Alice không bị hiển thị lẫn vào đây.

---

### PHẦN 6: Tài Liệu Liên Quan (Related Documents)

1. Ở trang chi tiết tài liệu Doc 1, cuộn xuống mục **Tài liệu liên quan** (Related Documents).
   - **Kỳ vọng**:
     - Hiển thị danh sách các tài liệu có độ tương đồng ngữ nghĩa.
     - **Không bao giờ xuất hiện chính tài liệu đang xem** (Doc 1 tự loại trừ chính nó).
     - **Không xuất hiện tài liệu trùng lặp checksum** (nếu bạn upload 2 file giống nhau).
     - **Không xuất hiện tài liệu đã bị xóa** (nằm trong Thùng rác).
2. Bấm vào một tài liệu liên quan trong danh sách.
   - **Kỳ vọng**: Điều hướng mượt mà sang trang chi tiết của tài liệu đó.

---

### PHẦN 7: Thống Kê Chủ Đề Quan Tâm (Stats Phase 5)

Bấm vào mục **Thống kê** (`/stats`) trên thanh điều hướng bên trái.

#### Bước 7.1: Bộ lọc 7 ngày và 30 ngày
1. Mặc định chọn khung thời gian **7 ngày gần nhất**.
   - **Kỳ vọng**: Bảng thống kê hiển thị số lượt đọc (`read_views`), số tài liệu đã đọc (`read_documents`) và số tài liệu mở từ tìm kiếm (`opened_from_search`) trong 7 ngày qua.
2. Chuyển sang bộ lọc **30 ngày gần nhất**.
   - **Kỳ vọng**: Số liệu tự động cập nhật, phản ánh đầy đủ hoạt động trong cả tháng (số lượt xem và tài liệu tăng lên phù hợp với log).

#### Bước 7.2: Kiểm tra tương tác mở từ tìm kiếm (Search Click Tracking)
1. Quay lại trang **Tìm kiếm** (`/search`), gõ `Docker`.
2. Bấm vào kết quả tìm kiếm để mở tài liệu.
3. Quay lại trang **Thống kê** (`/stats`).
   - **Kỳ vọng**: Chỉ số *"Mở từ tìm kiếm"* (`opened_from_search`) được ghi nhận chính xác cho tài liệu vừa mở.

#### Bước 7.3: Kiểm tra tính riêng tư của Thống kê (User Privacy)
1. Đăng xuất tài khoản Alice.
2. Đăng nhập bằng tài khoản **Carol** (`carol` / `Password@123`).
3. Vào trang **Thống kê** (`/stats`).
   - **Kỳ vọng**: Mọi chỉ số hiển thị là **0** (vì Carol là người dùng mới, chưa có hoạt động nào). Carol tuyệt đối không nhìn thấy số liệu của Alice hay Bob.

---

### PHẦN 8: Ma Trận Phân Quyền & Thu Hồi Quyền (Security & Revocation)

#### Bước 8.1: Quyền thành viên nhóm chỉ đọc (Bob - View Only)
1. Đăng nhập bằng tài khoản **Bob** (`bob` / `Password@123`).
2. Vào mục **Nhóm** (`/groups`), chọn Workspace 10.
3. Bấm xem tài liệu nhóm (Doc 2).
   - **Kỳ vọng**: Bob xem được tài liệu bình thường.
4. Bob thử gõ trực tiếp URL tài liệu cá nhân của Alice trên thanh địa chỉ trình duyệt:
   `http://localhost:5173/personal/documents/1`
   - **Kỳ vọng**: Trình duyệt điều hướng về trang lỗi **404 - Không tìm thấy tài liệu** (hoặc thông báo không có quyền).

#### Bước 8.2: Quyền người ngoài nhóm (Carol - Outsider)
1. Đăng nhập bằng tài khoản **Carol** (`carol` / `Password@123`).
2. Carol vào trang **Tìm kiếm** (`/search`), gõ từ khóa `Scrum` (từ khóa chỉ có trong tài liệu của Workspace 10).
   - **Kỳ vọng**: Kết quả trả về rỗng (0 kết quả), không để lộ tiêu đề hay đoạn trích của nhóm 10.
3. Carol thử gõ trực tiếp URL tài liệu nhóm 10:
   `http://localhost:5173/groups/10/documents/2`
   - **Kỳ vọng**: Trình duyệt báo lỗi **404 - Không tìm thấy tài liệu** (hoặc 403 Forbidden).

#### Bước 8.3: Kiểm tra Thu hồi quyền thành viên tức thời (Revocation)
1. Đăng nhập lại bằng tài khoản **Alice** (Trưởng nhóm).
2. Vào **Cài đặt nhóm Workspace 10** > **Quản lý thành viên**.
3. Bấm nút **Xóa / Thu hồi quyền** của Bob ra khỏi nhóm.
4. Chuyển sang một cửa sổ ẩn danh (Incognito) hoặc trình duyệt khác đang đăng nhập **Bob**.
5. Bob đang ở trang tài liệu nhóm Doc 2 (`/groups/10/documents/2`), bấm **F5 (Reload)**.
   - **Kỳ vọng**: Ngay lập tức, trang web hiển thị lỗi **404 Không tìm thấy tài liệu** hoặc đẩy ra khỏi nhóm. Hệ thống kiểm tra quyền trực tiếp từ cơ sở dữ liệu, không bị trễ do cache.

---

### PHẦN 9: Khả Năng Xử Lý Lỗi & Trạng Thái Rỗng (Error Handling & Empty State)

#### Bước 9.1: Tài liệu chưa có dữ liệu chỉ mục (Empty State)
1. Vào một tài liệu mới upload mà worker chưa xử lý hoặc file rỗng.
2. Mở tab **Hỏi đáp AI** hoặc tab **Tóm tắt**.
   - **Kỳ vọng**: Hiển thị hình minh họa trạng thái rỗng (Empty State) kèm dòng chữ: *"Tài liệu chưa được lập chỉ mục AI. Vui lòng thử lại sau khi chỉ mục hoàn tất."* Giao diện không bị vỡ hoặc đứng hình.

#### Bước 9.2: Giả lập lỗi kết nối máy chủ (Network / Server Error)
1. Mở DevTools (**F12**) > chuyển sang tab **Network**.
2. Tìm mục **Throttling** (mặc định là `No throttling`), chọn **Offline** (hoặc bấm chuột phải vào request `tag-suggestions` chọn **Block request URL**).
3. Thao tác trên giao diện (ví dụ: bấm nút "Gợi ý tag" hoặc "Tạo tóm tắt").
   - **Kỳ vọng**: Giao diện hiển thị banner cảnh báo lỗi thân thiện: *"Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền và thử lại."* kèm nút **"Thử lại"**. Tuyệt đối không hiển thị con số 0 giả tạo đánh lừa người dùng.

---

## 3. Bảng Checklist Nghiệm Thu Nhanh (Tester Checklist)

| STT | Hạng mục kiểm tra | Thao tác chính | Kết quả mong đợi | Đạt (✓) / Chưa đạt (✗) |
|:---:|:---|:---|:---|:---:|
| 1 | **Upload cá nhân** | Tải file PDF/DOCX | Báo thành công, trạng thái chuyển sang Sẵn sàng | [ ] |
| 2 | **List Preview** | Xem danh sách tài liệu | Có `preview_text` $\le 400$ ký tự, API không trả `content` | [ ] |
| 3 | **Tìm kiếm Từ khóa** | Gõ `khóa chính` | Hiện badge `lexical_content`, mở xem được đoạn trích | [ ] |
| 4 | **Tìm kiếm Ngữ nghĩa** | Gõ câu diễn đạt lại | Hiện badge `semantic`, tìm đúng tài liệu | [ ] |
| 5 | **Tìm kiếm Không dấu** | Gõ không dấu tiếng Việt | Trả về kết quả tương đương có dấu | [ ] |
| 6 | **Hỏi đáp có căn cứ** | Hỏi câu có trong bài | Trả lời trích nguyên văn + citation chunk chính xác | [ ] |
| 7 | **Hỏi đáp thiếu căn cứ** | Hỏi câu ngoài bài | Báo không đủ căn cứ, không bịa đặt | [ ] |
| 8 | **Tóm tắt tài liệu** | Bấm Tạo tóm tắt | Hiện đoạn tóm tắt; F5 nạp tức thì từ cache | [ ] |
| 9 | **Không ghi đè mô tả** | Kiểm tra description | Mô tả người dùng nhập vẫn giữ nguyên vẹn | [ ] |
| 10 | **Gợi ý Tag cá nhân** | Bấm Gợi ý tag | Không lỗi 500, loại bỏ tag đã gắn, có căn cứ | [ ] |
| 11 | **Gợi ý Tag nhóm** | Bấm Gợi ý tag nhóm | Nhận diện đúng tag chia sẻ qua `workspace_tags` | [ ] |
| 12 | **Tài liệu liên quan** | Mở Related Docs | Tự loại chính nó, không trùng checksum | [ ] |
| 13 | **Thống kê 7/30 ngày** | Đổi bộ lọc ngày | Số liệu lượt đọc và search click khớp thực tế | [ ] |
| 14 | **Quyền riêng tư Stats** | Đăng nhập Carol xem stats | Mọi chỉ số là 0, không rò rỉ dữ liệu người khác | [ ] |
| 15 | **Chặn người ngoài nhóm** | Carol mở URL nhóm 10 | Bị chặn 404, tìm kiếm không ra tài liệu nhóm | [ ] |
| 16 | **Thu hồi quyền tức thời** | Xóa Bob khỏi nhóm, F5 | Bob lập tức nhận 404, không bị trễ cache | [ ] |
| 17 | **Xử lý lỗi mạng** | Block API request | Giao diện báo lỗi rõ ràng, không hiện số 0 giả | [ ] |
