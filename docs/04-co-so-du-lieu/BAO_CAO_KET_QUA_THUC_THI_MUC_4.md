# Báo cáo kết quả thực thi mục 4 — rà soát và tối ưu CSDL

- **Ngày:** 24/11/2026
- **Phạm vi:** dọn các cấu trúc legacy `processing_jobs`, `trash_batches` và `documents.trash_batch_id`.
- **Migration được báo cáo đã áp dụng:** `a2b3c4d5e6f7` (từ `f1a2b3c4d5e6`).
- **Nguồn số liệu:** nhật ký thực thi và hậu kiểm được ghi trong [báo cáo rà soát CSDL](BAO_CAO_RA_SOAT_VA_TOI_UU_CSDL.md). Đây là báo cáo tổng kết; các truy vấn live không được chạy lại trong lúc soạn tài liệu này.
- **Kiểm tra chéo OpenCode:** đã review source ở chế độ chỉ đọc; không chạy migration, test suite hay truy vấn Live DB.

## Kết quả đạt được

Theo nhật ký thực thi, trước migration đã xác nhận:

- `processing_jobs`: 0 bản ghi, không có FK đi vào, trigger hoặc view phụ thuộc.
- `documents.trash_batch_id`: 0/1.076 tài liệu có giá trị; một FK trỏ tới `trash_batches`.
- `trash_batches`: 2 seed row lịch sử, không có tài liệu đang tham chiếu.
- Ngoài phạm vi bị loại trừ khỏi migration: `categories` có 6 bản ghi; `documents.category_id` được giữ nguyên. Không bật pgvector hay tạo cấu trúc vector.

Migration `a2b3c4d5e6f7` bỏ FK và cột `documents.trash_batch_id`, sau đó xóa hai bảng legacy. Nhật ký hậu kiểm ghi nhận cả ba đối tượng đã biến mất, 1.076/1.076 tài liệu và 6/6 category còn nguyên, Alembic trên DB ở revision `a2b3c4d5e6f7`, và các truy vấn ORM được kiểm tra không gặp lỗi cột.

Để giữ tương thích phản hồi API, model `Document` khai báo `trash_batch_id`/`trash_batch` là `ClassVar` thay vì cột ORM. Model `TrashBatch` được đánh dấu deprecated và bỏ quan hệ ORM với `Document`. Báo cáo thực thi ghi nhận 17/17 test backend liên quan, 7/7 kịch bản truy vấn live, kiểm tra router thùng rác và frontend build/typecheck đều thành công. Đây là kết quả được ghi lại từ lần thực thi; chưa chạy lại độc lập trong lúc viết bản tổng kết này.

## Tự đánh giá hiệu quả

**Mục tiêu thu gọn schema trên Live DB được báo cáo là đã đạt, nhưng triển khai chưa sạch hoàn toàn ở cấp repository.** Preflight được ghi nhận không có job hoặc tài liệu đang tham chiếu. Tuy nhiên, OpenCode tìm thấy các script seed và đồng bộ schema còn tham chiếu tới `TrashBatch`/`ProcessingJob`; một số gọi `Base.metadata.create_all`, có thể lỗi khi truy cập bảng đã xóa hoặc tạo lại bảng legacy. Do đó không thể kết luận toàn bộ đường vận hành của repository đã được làm sạch.

**Hiệu quả lưu trữ là có thật nhưng chưa được định lượng bằng byte.** Xóa hai bảng và một cột làm giảm phần lưu trữ cấu trúc và chi phí duy trì schema/index/FK liên quan. Tuy vậy, không có số đo dung lượng trước/sau nên chưa thể công bố mức tiết kiệm cụ thể. Không có benchmark latency trước/sau; thay đổi này là dọn cấu trúc, không phải bằng chứng rằng API nhanh hơn.

**Khả năng triển khai toàn môi trường chưa hoàn tất.** Theo tài liệu, startup DDL fallback vẫn được giữ vì migration runner chưa được xác minh trên mọi node Staging/Production. Nhật ký ghi nhận mục 4.1 đã được áp dụng trên Live DB, nhưng mục 4.2 còn chờ bằng chứng rollout. Hạng mục vector tiếp tục hoãn theo yêu cầu.

## Kiểm tra chéo độc lập bằng OpenCode

OpenCode đã đọc migration, hai model, các tham chiếu còn lại và revision trước đó. Review không kết nối DB và không chạy migration/test. Kết luận: upgrade có vẻ đúng ý định nếu schema live khớp preflight; các rủi ro thực tế nằm ở downgrade và đường vận hành còn sót.

| Mức độ | Phát hiện | Tác động |
| :--- | :--- | :--- |
| **Cao** | `a2b3c4d5e6f7...py`, phần `downgrade()` tạo `trash_batches.id SERIAL`, rồi insert seed IDs 1 và 2 nhưng không đồng bộ sequence bằng `setval`. | Lần insert tự tăng tiếp theo có thể dùng ID 1 và lỗi khóa chính. Downgrade hiện chưa an toàn để dùng như đường rollback. |
| **Trung bình** | Downgrade gắn lại seed row với `workspace_id=3/5`, `deleted_by=6/7`; các FK này có thể không còn tồn tại sau này. Ràng buộc FK cũng được thêm không idempotently. | Rollback phụ thuộc dữ liệu khác có thể đã thay đổi kể từ lúc migrate. |
| **Trung bình** | Còn tham chiếu tại `backend/db/seed_incremental.py`, `backend/db/seed.py`, `backend/db/sync_group_schema.py` và `backend/db/sync_share_schema.py`; hai script sync gọi `Base.metadata.create_all`. | Các script này có thể truy cập hoặc tạo lại bảng vừa xóa, làm lệch schema và gây lỗi trong các luồng seed/sync. Cần xác minh cách các script được gọi trước khi coi cleanup hoàn tất. |
| **Thấp–trung bình** | `TrashBatch`/`ProcessingJob` vẫn được đăng ký trong `backend/app/models/__init__.py`; tài liệu schema map còn mô tả các bảng/cột như cấu trúc hiện hữu. | Query ORM vào hai bảng sẽ lỗi trên DB đã migrate; autogenerate có thể đề xuất tạo lại bảng do metadata vẫn khai báo chúng. Tài liệu gây nhầm lẫn cho lần migration sau. |
| **Thấp–trung bình** | `DROP TABLE ... CASCADE` ở migration có thể loại bỏ phụ thuộc DB ngoài kế hoạch nếu preflight không phát hiện hết. | Cần đối chiếu catalog thực tế; source tự nó không chứng minh được phạm vi phụ thuộc live. |

OpenCode xác nhận `ClassVar` giữ được trường `DocumentOut.trash_batch_id` trong serialize, nhưng không còn map cột ORM; giá trị khi load từ DB sẽ luôn `null`, và `trash_batch` luôn `None`. Điều này chỉ tương thích với dữ liệu hiện có nếu tiền kiểm 0 document reference là chính xác. Reviewer cũng không tìm thấy `joinedload`/filter đang dùng hai thuộc tính này.

OpenCode nhận thấy revision `a2b3c4d5e6f7` có vẻ là head duy nhất trong scan mã nguồn. Tuy nhiên, reviewer không thể xác nhận qua source rằng Live DB thật sự ở revision đó, số lượng bản ghi, tên FK, các seed FK còn tồn tại, hay các đối tượng phụ thuộc. Các claim live trong phần kết quả vì thế dựa trên nhật ký triển khai đã ghi lại, không phải xác minh độc lập của OpenCode.

## Khắc phục các phát hiện OpenCode (Hoàn thiện mã nguồn & quy trình repo)

Sau đợt kiểm tra chéo độc lập từ OpenCode, toàn bộ các phát hiện về mã nguồn và quy trình trong repository đã được khắc phục triệt để theo nguyên tắc thay đổi tối thiểu, tuyệt đối không kết nối Live DB và không tạo thêm migration revision không cần thiết:

### 1. Khắc phục đường rollback trong downgrade `a2b3c4d5e6f7`
- **Đồng bộ SERIAL sequence:** Đã bổ sung câu lệnh `SELECT setval(pg_get_serial_sequence('trash_batches', 'id'), COALESCE((SELECT MAX(id) FROM trash_batches), 1), (SELECT MAX(id) IS NOT NULL FROM trash_batches));` và tương tự cho `processing_jobs` ngay sau khi nạp seed rows. Điều này đảm bảo ID tiếp theo luôn `> max(id)`, loại bỏ hoàn toàn nguy cơ trùng khóa chính khi có bản ghi mới.
- **Ràng buộc khóa ngoại cha và bảo vệ toàn vẹn:** Khối PL/pgSQL `DO $$ BEGIN ... END $$;` kiểm tra sự tồn tại của các bản ghi cha (`workspaces.id IN (3, 5)` và `users.id IN (6, 7)`). Nếu bất kỳ bản ghi cha nào bị thiếu, câu lệnh sẽ `RAISE EXCEPTION` và transaction rollback lập tức. **Lưu ý kỹ thuật:** Downgrade vẫn phụ thuộc cứng vào các parent seed IDs này; nếu thiếu bất kỳ parent nào trong số đó thì CSDL không thể rollback được.
- **Khôi phục schema & FK chuẩn xác, giới hạn của idempotent:** Bảng và các khóa ngoại `ON DELETE SET NULL`, `ON DELETE RESTRICT` được tái tạo đúng nguyên bản gốc, có kiểm tra `IF NOT EXISTS` trên catalog `information_schema.table_constraints`. Cần lưu ý rằng `CREATE TABLE IF NOT EXISTS` không tự sửa chữa (repair) một bảng đã tồn tại dở dang (partial table) nếu bảng đó bị thiếu cột hoặc thiếu ràng buộc FK. Phần `upgrade()` giữ nguyên không sửa đổi.

### 2. Tách hoàn toàn model legacy khỏi SQLAlchemy metadata
- **Tách khỏi `Base`:** `TrashBatch` và `ProcessingJob` được chuyển thành các Python stub class thông thường (không kế thừa `Base`). Do đó, `Base.metadata.tables` không còn ghi nhận hai bảng này (`'trash_batches' not in Base.metadata.tables`, `'processing_jobs' not in Base.metadata.tables`).
- **Ngăn chặn recreate:** `Base.metadata.create_all` và `alembic revision --autogenerate` không còn khả năng tự ý tái tạo lại hai bảng legacy.
- **Dọn dẹp đăng ký:** Gỡ bỏ import `TrashBatch` và `ProcessingJob` khỏi `backend/app/models/__init__.py` và `alembic/env.py`.
- **Dọn dẹp quan hệ ORM:** Gỡ bỏ `User.deleted_trash_batches` và `Workspace.trash_batches`.
- **Bảo toàn API shape:** Giữ `Document.trash_batch_id: ClassVar[Optional[int]] = None` và `DocumentOut.trash_batch_id: Optional[int] = None`, đảm bảo các serializer trả về đúng trường `trash_batch_id: null` mà không gây lỗi mapping ORM.

### 3. Làm sạch triệt để các script seed & schema sync
- **`backend/db/seed.py`:** Loại bỏ import `TrashBatch` và `ProcessingJob`; loại bỏ hàm `seed_trash_batches`; loại bỏ trường `"trash_batch_id"` khi tạo document mẫu; loại bỏ khối tạo `ProcessingJob` virus scan trong `seed_interactions`; loại bỏ import `timedelta` không còn sử dụng.
- **`backend/db/seed_incremental.py`:** Xóa bỏ hoàn toàn hàm no-op `seed_trash_batches` (vì qua đối chiếu Graphify xác nhận không còn caller nào); xóa bỏ các tham số `trash_batches` không dùng ở `seed_documents` và `seed_additional_data`; loại bỏ import `timedelta` không dùng; giữ toàn bộ các hàm seed dữ liệu khác hoạt động bình thường, bảo đảm tính idempotent.
- **`backend/db/sync_group_schema.py`:** Gỡ bỏ import `processing_job` và `trash_batch`.
- **`backend/db/sync_share_schema.py`:** Xác nhận độc lập không có bất kỳ tham chiếu nào đến hai bảng legacy.

### 4. Cập nhật tài liệu kỹ thuật
- **`docs/04-co-so-du-lieu/db-schema-map.md`:** Đã cập nhật sơ đồ Mermaid, từ điển bảng, quan hệ ORM, ma trận FK và checklist 11 bước, ghi nhận rõ ràng `trash_batches`, `processing_jobs`, và `documents.trash_batch_id` đã được DROP trong migration `a2b3c4d5e6f7`.

### 5. Kết quả kiểm tra offline & tự động
- **Alembic revision chain:** Tại thời điểm đợt `a2b3c4d5e6f7`, xác nhận 1 head duy nhất `a2b3c4d5e6f7`. HEAD repository hiện tại là `b3c4d5e6f7a8` (chưa deploy Live).
- **Unit test suite (`backend/tests/test_batch3_deployment_and_legacy_tracing.py`):** 5/5 test PASSED, kiểm tra:
  - Cây migration 1 head duy nhất.
  - `trash_batches` và `processing_jobs` không nằm trong `Base.metadata.tables`.
  - `User` và `Workspace` không còn quan hệ legacy.
  - `DocumentOut` serialize trả về `trash_batch_id: null`.
  - `Document.trash_batch_id` và `Document.trash_batch` là None.
  - Offline downgrade SQL phát sinh đủ parent check `RAISE EXCEPTION`, sequence sync `setval`, và DDL idempotent.
- **Kiểm tra mã nguồn (`rg`):** Xác nhận không còn caller active nào trong `backend/app/`, `backend/db/`, `alembic/` tham chiếu đến `TrashBatch` hay `ProcessingJob` ngoại trừ các class stub bảo toàn và test case kiểm tra detachment.

### 6. Giới hạn còn lại & Phạm vi hoãn
- **Ràng buộc hoàn nguyên của Downgrade:** Hàm `downgrade()` phụ thuộc cứng vào sự tồn tại của các bản ghi cha `workspaces` (id 3, 5) và `users` (id 6, 7) để khôi phục 2 dòng seed lịch sử. Nếu bất kỳ parent nào trong số này bị xóa khỏi DB, câu lệnh sẽ `RAISE EXCEPTION` và transaction bị rollback; CSDL không thể rollback được nếu thiếu dữ liệu cha. Ngoài ra, mệnh đề `CREATE TABLE IF NOT EXISTS` không tự sửa chữa một bảng dở dang (partial table) nếu bảng đã tồn tại sẵn nhưng thiếu ràng buộc FK hoặc cột.
- **Không thực hiện live rollback:** Không có môi trường disposable PostgreSQL độc lập; tuân thủ nghiêm ngặt chỉ đạo không chạy rollback trên database Live Neon. Tính đúng đắn của downgrade được kiểm chứng qua static SQL analysis (`--sql`) và offline unit test.
- **Ghi nhận thay đổi DocumentStats ngoài phạm vi:** Các thay đổi liên quan đến `DocumentStats` (hàm `__init__` tự tạo stats mặc định trên `Document`, và thuộc tính `cascade="all, delete-orphan", passive_deletes=True` trên quan hệ `stats`) đã hiện diện trong working tree khi bắt đầu xử lý phát hiện OpenCode, không được chỉnh trong phạm vi này; nguồn gốc commit/thời điểm không xác định do workspace có nhiều thay đổi chưa commit và không có baseline sạch.
- **Startup DDL fallback:** Tiếp tục giữ lại trong `backend/app/main.py` theo quyết định thiết kế chờ xác minh runner độc lập trên Staging/Production.
- **Vector / pgvector:** Tiếp tục hoãn theo chỉ đạo.
- **Không tuyên bố benchmark mới:** Không đo đạc thêm số liệu byte hay benchmark latency; chỉ tập trung vào an toàn cấu trúc và tính toàn vẹn của mã nguồn.

## Bổ sung: Trạng thái thực tế của đợt đồng bộ Schema & Migration (`b3c4d5e6f7a8`)

Phần này thay thế các tuyên bố "hoàn tất/đồng bộ hoàn toàn" trước đó. Revision `b3c4d5e6f7a8` đã có trong repository và đã được kiểm thử trên PostgreSQL disposable, nhưng **chưa được deploy hoặc chạy trên Live DB**.

1. **Revision Alembic `b3c4d5e6f7a8` nối tiếp `a2b3c4d5e6f7`**:
   - Sole head trong repository: `b3c4d5e6f7a8`.
   - `chk_document_shares_status`: mở rộng đủ 6 giá trị (`pending`, `accepted`, `rejected`, `auto_accepted`, `expired`, `withdrawn`), có preflight `RAISE EXCEPTION` và `NOT VALID` → `VALIDATE CONSTRAINT`.
   - `ix_documents_bundle_parent_id`: tạo index khớp ORM.
   - `community_subject_stats`: giữ đúng 5 cột và type Live — `document_count` bigint (`count(DISTINCT d.id)`), `total_downloads` numeric (`COALESCE(sum(dl.download_count), 0::numeric)`), `avg_rating` numeric (`COALESCE(avg(dr.avg_stars), 0::numeric)`). Chỉ thêm filter `download_logs.action = 'DOCUMENT_DOWNLOADED'` trong subquery download; không dùng `ROUND`, không đổi sang `::float`, không lấy average toàn bộ ratings.
   - Unique index `uq_community_subject_stats_subject_id(subject_id)` được giữ ở cả upgrade và downgrade.
   - Drop view không dùng `CASCADE`; nếu có object phụ thuộc, migration fail và transaction rollback.
2. **Trigram index trên Live**:
   - Dump Live mới và truy vấn catalog read-only trước đó xác nhận **có cả hai** index `idx_document_title_trgm` và `idx_documents_title_trgm`, đều là GIN `title gin_trgm_ops`, scans lần lượt 0 và 5.
   - Báo cáo trước đây dựa trên `graphify-out/catalog_inventory.json` cũ (file này chỉ là log SQL, không phải catalog đầy đủ) và kết luận sai rằng Live không có `idx_documents_title_trgm`. Kết luận đó đã được sửa.
   - Migration chỉ drop `idx_document_title_trgm` sau preflight catalog: cả hai valid/ready, cùng bảng/cột/opclass/predicate/expression/access method/options, không gắn constraint, retained đúng GIN `title gin_trgm_ops`. Nếu không chứng minh đủ, giữ cả hai và `RAISE NOTICE`. Nếu DB sạch thiếu retained index, migration tạo `idx_documents_title_trgm` chuẩn. Downgrade không xóa retained index.
3. **Scheduler**:
   - `refresh_community_subject_stats()` dùng transaction-level `pg_try_advisory_xact_lock` trong cùng transaction với `REFRESH MATERIALIZED VIEW CONCURRENTLY`, an toàn với Neon/PgBouncer transaction pooler. Lock tự nhả khi commit/rollback; không còn session lock + `AUTOCOMMIT` + unlock thủ công.
4. **Kiểm thử đã chạy**:
   - Unit tests repo: `test_schema_sync_shares_and_community_stats.py` 9 passed; `test_batch3_deployment_and_legacy_tracing.py` 5 passed; `test_shares.py` 7 passed (tổng 21 passed ở nhóm liên quan; xem log thực tế khi chạy).
   - PostgreSQL 18.6 disposable, schema dựng từ dump Live: upgrade `a2 -> b3` và downgrade `b3 -> a2` thành công; 6 statuses hợp lệ được chấp nhận, status invalid bị CHECK từ chối; downloads chỉ đếm `DOCUMENT_DOWNLOADED`; `avg_rating` = trung bình của trung bình từng document (3.0) khác average toàn bộ ratings (3.6667); type numeric/bigint đúng; unique index tồn tại.
   - Trigram guard: DB sạch thiếu retained index được tạo chuẩn rồi drop index trùng; trường hợp index trùng là partial không chứng minh đủ thì giữ cả hai và `NOTICE`; view phụ thuộc làm drop fail và rollback, không CASCADE.
   - Scheduler: refresh thật trên local PostgreSQL thành công; connection thứ hai bị skip khi lock đang giữ; rollback nhả lock để connection sau lấy được.
5. **Giới hạn & blocker thực tế**:
   - **Chưa deploy Live**, chưa chạy upgrade/downgrade trên Neon. Không có kết nối Live trong đợt này.
   - **Chuỗi `alembic upgrade head` từ DB trống vẫn thất bại** tại `f844331e6c1e` vì migration gốc `dae4972dff87` không tạo bảng `folders`; các bảng `subjects`, `document_ratings`, `community_submissions` cũng không có migration tạo. Đây là blocker của migration cũ, ngoài phạm vi sửa đợt này. Vì vậy chưa thể tuyên bố "full chain from clean DB" đã đạt.
   - Việc xác minh `a2 -> b3` dùng schema Live-like disposable (dump schema-only), không phải DB trống hoàn toàn.
   - Các thay đổi khác trong working tree (model, seed, router, docs khác) vẫn là dirty/untracked có sẵn; đợt này chỉ sửa migration `b3`, scheduler, test liên quan và các tài liệu được nêu.

## Kết luận

Revision `b3c4d5e6f7a8`, scheduler và trigram preflight đã được sửa và kiểm thử cục bộ trong phạm vi cho phép. Kết quả không đồng nghĩa với việc schema đã đồng bộ hoàn toàn trên Live: migration chưa được deploy, chuỗi từ DB trống còn blocker ở migration cũ, và các tuyên bố "hoàn tất" trước đây đã được hạ xuống mức tương ứng với bằng chứng thực tế.
