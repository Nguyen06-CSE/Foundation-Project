# BÁO CÁO PHÂN TÍCH KIẾN TRÚC & LỘ TRÌNH TRIỂN KHAI TÍNH NĂNG AI TRÊN HỆ THỐNG THƯ VIỆN SỐ

## 1. Bối cảnh và Mục tiêu

Đây là tài liệu định hướng cho giai đoạn triển khai AI tiếp theo. Theo source hiện tại, hệ thống **chưa triển khai** pipeline phân đoạn (chunking), vector hóa (embedding), bảng vector hoặc worker RAG. Các nội dung dưới đây là kiến trúc đề xuất, không phải mô tả chức năng đang vận hành.
1. Tìm kiếm ngữ nghĩa theo nội dung tài liệu (Semantic Search).
2. Gợi ý các tài liệu liên quan (Document Recommendation).

Mục tiêu của tài liệu này là đánh giá, so sánh các phương án kiến trúc để mở rộng thêm hai tính năng giá trị gia tăng: **Tóm tắt nhanh nội dung (Quick Summarization)** và **Hỏi đáp trên tài liệu (Document Q&A)**, từ đó lựa chọn giải pháp tối ưu nhất với điều kiện hạ tầng hiện tại và định hướng phát triển dài hạn.

---

## 2. Phân tích Hai Phương án Kiến trúc Triển khai

Hiện nay có hai hướng tiếp cận chính để xây dựng tính năng Hỏi đáp và Tóm tắt trên kho tài liệu số:

### Phương án 1: Kiến trúc RAG dựa trên Cơ sở dữ liệu Vector (Vector-based Retrieval & Processing)
* **Nguyên lý hoạt động:** Tài liệu được chia thành các đoạn nhỏ (chunks), chuyển đổi thành vector và lưu trữ trong Database. Khi người dùng đặt câu hỏi hoặc yêu cầu xử lý, hệ thống sử dụng các thuật toán tìm kiếm độ tương đồng (Cosine Similarity, Hybrid Search, MMR...) để trích xuất ra các đoạn văn bản liên quan nhất, sau đó tổng hợp câu trả lời.
* **Luồng xử lý:** `Truy vấn người dùng` $\rightarrow$ `Vector hóa truy vấn` $\rightarrow$ `Truy vấn Top-K Chunks từ Vector DB` $\rightarrow$ `Tổng hợp kết quả`.

### Phương án 2: Kiến trúc Nạp toàn bộ Ngữ cảnh (Long-Context & Caching — Mô hình của NotebookLM)
* **Nguyên lý hoạt động:** Không phụ thuộc vào việc cắt nhỏ và tìm kiếm vector cục bộ. Khi người dùng chọn một hoặc nhiều tài liệu, hệ thống nạp toàn bộ nội dung văn bản thô (hàng trăm nghìn đến hàng triệu tokens) trực tiếp vào bộ nhớ đệm (Context Cache / VRAM) của các mô hình ngôn ngữ lớn (LLM) có cửa sổ ngữ cảnh siêu lớn (như Gemini 1.5/2.0, Claude...).
* **Luồng xử lý:** `Chọn toàn bộ tài liệu` $\rightarrow$ `Token hóa toàn văn` $\rightarrow$ `Lưu tạm trạng thái tính toán vào RAM/VRAM` $\rightarrow$ `Xử lý trực tiếp mọi yêu cầu trên toàn bộ ngữ cảnh`.

---

## 3. Bảng So sánh Chi tiết Hai Phương án

| Tiêu chí đánh giá | Phương án 1: Vector DB & Thuật toán truy xuất (RAG) | Phương án 2: Nạp toàn bộ ngữ cảnh (Long-Context / NotebookLM) |
| :--- | :--- | :--- |
| **Yêu cầu phần cứng (RAM / CPU / GPU)** | **Thấp.** Tận dụng tối đa tài nguyên cơ sở dữ liệu sẵn có, không yêu cầu bộ nhớ đệm lớn để giữ ngữ cảnh dài. | **Rất cao.** Nếu tự triển khai trên máy chủ nội bộ sẽ đòi hỏi dung lượng RAM/VRAM khổng lồ để xử lý đồng thời nhiều người dùng và tài liệu dài. |
| **Chi phí vận hành & API** | **Thấp và ổn định.** Chỉ xử lý trên một lượng nhỏ dữ liệu trích xuất (Top-K chunks), tiết kiệm tối đa chi phí tính toán và token. | **Cao.** Chi phí tăng tuyến tính theo độ dài tài liệu và số lượng người dùng truy cập đồng thời. |
| **Tính tự chủ hệ thống** | **Cao.** Kiểm soát hoàn toàn luồng dữ liệu, thuật toán truy xuất và bảo mật dữ liệu nội bộ ngay trên hạ tầng sẵn có. | **Phụ thuộc lớn.** Phụ thuộc vào năng lực phần cứng cực mạnh hoặc phụ thuộc hoàn toàn vào hạ tầng API của bên thứ ba. |
| **Khả năng mở rộng kho dữ liệu** | **Rất tốt.** Dễ dàng tìm kiếm và hỏi đáp chéo trên hàng nghìn, hàng chục nghìn tài liệu cùng lúc. | **Giới hạn.** Chỉ hoạt động hiệu quả trong phạm vi một hoặc một nhóm nhỏ tài liệu nằm trong giới hạn cửa sổ ngữ cảnh. |
| **Chất lượng Hỏi đáp (Q&A)** | **Tốt với câu hỏi cụ thể.** Tìm chính xác thông tin chi tiết nằm sâu trong tài liệu. | **Toàn diện.** Trả lời tốt cả câu hỏi chi tiết lẫn câu hỏi mang tính tổng hợp, so sánh xuyên suốt. |
| **Chất lượng Tóm tắt** | **Trung bình.** Dễ bị rời rạc hoặc thiếu mạch lạc nếu chỉ lấy ngẫu nhiên một vài vector đại diện. | **Xuất sắc.** Nắm bắt trọn vẹn mạch văn từ đầu đến cuối, văn phong tự nhiên và logic. |

---

## 4. Quyết định Lựa chọn cho Giai đoạn Hiện tại

Dựa trên bảng phân tích trên và điều kiện thực tế của dự án, **Phương án 1 (Kiến trúc dựa trên Vector DB)** được chọn làm hướng triển khai dự kiến cho giai đoạn tiếp theo vì 4 lý do cốt lõi:

1. **Phù hợp với năng lực hạ tầng máy chủ hiện tại:** Cấu hình máy chủ hiện tại chưa đủ đáp ứng việc lưu trữ đệm (caching) toàn bộ nội dung của nhiều tài liệu dài cùng lúc cho lượng lớn người dùng truy cập đồng thời. Phương án 1 giúp hệ thống vận hành mượt mà, nhẹ nhàng mà không gây nghẽn cổ chai về RAM/CPU.
2. **Tối ưu hóa tính tự chủ và bảo mật:** Việc tự quản lý quy trình phân đoạn, lưu trữ vector và thuật toán truy xuất giúp hệ thống làm chủ hoàn toàn công nghệ lõi, giảm thiểu sự phụ thuộc vào các dịch vụ bên ngoài.
3. **Tận dụng 100% hạ tầng dữ liệu đã xây dựng:** Bảng dữ liệu vector đã có sẵn hoàn toàn đáp ứng được bài toán Hỏi đáp cơ bản (RAG) mà không cần thay đổi cấu trúc cơ sở dữ liệu.
4. **Giải pháp khắc phục nhược điểm tóm tắt trên Phương án 1:** Thay vì dùng tìm kiếm vector (dễ gây rời rạc), tính năng tóm tắt nhanh sẽ truy vấn trực tiếp các đoạn văn bản của tài liệu theo đúng thứ tự chỉ mục (`chunk_index` tăng dần) và **lưu trữ đệm (cache) kết quả tóm tắt ngay trong Database**. Điều này vừa đảm bảo nội dung tóm tắt mạch lạc, vừa tránh việc phải tính toán lại nhiều lần.

---

## 5. Định hướng Mở rộng & Kiến trúc Lai (Hybrid Architecture) trong Tương lai

Việc lựa chọn Phương án 1 ở hiện tại không đóng lại khả năng nâng cấp, mà đóng vai trò là nền móng vững chắc để tiến tới **Kiến trúc Lai (Hybrid Architecture)** khi hệ thống được nâng cấp hạ tầng hoặc tích hợp thêm các API mô hình AI chuyên sâu:

* **Tầng 1 — Xử lý nội bộ bằng Vector DB (Mặc định):**
  * Đảm nhiệm các tác vụ tần suất cao: Tìm kiếm ngữ nghĩa toàn thư viện, gợi ý tài liệu liên quan, hỏi đáp nhanh các thông tin cụ thể và cung cấp bản tóm tắt tiêu chuẩn đã được lưu sẵn.
  * *Mục tiêu:* Giữ tốc độ phản hồi nhanh nhất và chi phí vận hành ở mức thấp nhất.
* **Tầng 2 — Tích hợp API AI & Long-Context (Mở rộng theo nhu cầu chuyên sâu):**
  * Khi nâng cấp máy chủ hoặc tích hợp các API LLM hiện đại, hệ thống sẽ kích hoạt luồng xử lý toàn văn bản cho các yêu cầu đặc biệt như: **Tóm tắt tùy chỉnh theo góc nhìn người dùng**, **Phân tích chuyên sâu toàn bộ tài liệu dài**, hoặc **Hỏi đáp tổng hợp phức tạp**.
  * *Mục tiêu:* Mang lại trải nghiệm thông minh, văn phong tự nhiên tương đương NotebookLM cho các tác vụ nâng cao mà không làm quá tải tài nguyên cho các tác vụ cơ bản hàng ngày.

### Sơ đồ Luồng Vận hành Mục tiêu (Giai đoạn Mở rộng)

```text
                        [ Yêu cầu từ Người dùng ]
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
   [ Tác vụ Cơ bản & Toàn kho ]        [ Tác vụ Chuyên sâu & Tùy chỉnh ]
   - Tìm kiếm / Gợi ý tài liệu         - Hỏi đáp tổng hợp toàn văn bản
   - Hỏi đáp chi tiết cụ thể           - Tóm tắt theo yêu cầu đặc biệt
   - Xem tóm tắt nhanh có sẵn                        │
                 │                                   ▼
                 ▼                      [ Tầng API AI / Long-Context ]
   [ Tầng Vector DB Nội bộ ]            (Nạp toàn bộ ngữ cảnh tài liệu)
   (Tối ưu tốc độ & Tài nguyên)                      │
                 │                                   ▼
                 └─────────────────► [ Trả kết quả cho Người dùng ]
```

---

## 6. Trạng thái và kết luận

Các quyết định trong tài liệu này chưa đồng nghĩa với việc tính năng đã được triển khai. Khi bắt đầu thực hiện, cần bổ sung đặc tả schema, worker, embedding API, retry/idempotency và endpoint Q&A/tóm tắt.

Lựa chọn **Phương án 1** ở thời điểm hiện tại là bước đi thực tế, an toàn và tối ưu nhất về mặt kỹ thuật lẫn chi phí. Kiến trúc này đảm bảo hệ thống thư viện số vận hành ổn định trên cấu hình máy chủ hiện có, giữ vững tính tự chủ công nghệ, đồng thời hoàn toàn sẵn sàng để tích hợp linh hoạt với các API AI thế hệ mới theo mô hình Hybrid trong tương lai.
