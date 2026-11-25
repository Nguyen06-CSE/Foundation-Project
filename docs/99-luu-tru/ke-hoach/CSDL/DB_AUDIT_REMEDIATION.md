---
title: Kiểm Toán & Kế Hoạch Khắc Phục Cơ Sở Dữ Liệu
sidebar_label: 🚨 Kiểm toán & Khắc phục
sidebar_position: 6
---

# Kiểm Toán & Kế Hoạch Khắc Phục Cơ Sở Dữ Liệu

> [!IMPORTANT]
> **Đây là tài liệu điều phối duy nhất để sửa database.** Nó gộp (1) 14 phát hiện của bản review độc lập và (2) kết quả phản biện/đối chiếu với code + DB thật. Mọi thay đổi DDL phải đi qua các mã `M0.x`–`M3.x` ở phần 7, theo đúng thứ tự ưu tiên.
>
> **Ngày cập nhật trạng thái:** 2026-11-23 (bổ sung ghi chú ngày 25/11/2026) · **DB:** Neon `neondb`, PostgreSQL 18.7 · **Live `alembic_version` ghi nhận ngày 23/11:** `c8d9e0f1a2b3` · **Head repository hiện tại:** `b3c4d5e6f7a8` (**chưa deploy Live**). Không có kết nối Live trong đợt rà soát ngày 25/11; trạng thái Live cần được xác minh lại trước khi triển khai.

---

## 0. Cách đọc tài liệu này

### 0.1 Nguồn bằng chứng (xếp theo độ tin cậy)

| Nguồn | Vai trò | Ghi chú |
| :--- | :--- | :--- |
| **DB thật (Neon, query trực tiếp)** | Sự thật về trạng thái hiện tại | `pg_catalog`, `information_schema`, `pg_stat_user_indexes`; chạy audit ngày 23/11/2026. |
| **SQLAlchemy ORM** (`backend/app/models/`) | Ý định thiết kế | Nơi khai báo PK, cascade, `ondelete`, default. **Khác DB ở 2 chỗ** (xem M1.3). |
| **Alembic** (`alembic/versions/`, 17 file) | Lịch sử tiến hóa | Không tái tạo được schema hiện tại từ DB trống (xem M0.4); HEAD repository là `b3c4d5e6f7a8`, chưa deploy. |
| **Router / service** (`backend/app/`) | Hành vi thực tế | Chứng minh feature nào còn dùng, bug nào đang trả về API. |
| `docs/references/sql/*.sql` | Tham khảo lịch sử | Không dùng làm nguồn thực thi. |

### 0.2 Thang phán quyết

| Ký hiệu | Nghĩa |
| :--- | :--- |
| ✅ **ĐÚNG** | Phát hiện khớp DB thật và cần xử lý. |
| 🟡 **ĐÚNG MỘT PHẦN** | Có thật nhưng phạm vi/đối tượng/kết luận cần chỉnh. |
| ❌ **SAI** | Sai do bản export (mất mệnh đề `WHERE`); DB thật đúng. |
| ⚪ **ĐÚNG NHƯNG ƯU TIÊN THẤP** | Đúng về mặt thiết kế, sửa tốn kém hơn lợi ích. |

### 0.3 Nguyên tắc khi sửa

1. **Không tin export schema.** Mọi kết luận phải có query chạy trên DB thật (Phụ lục A).
2. **Không add CHECK khi data đang bẩn.** Clean trước, hoặc `ADD CONSTRAINT ... NOT VALID` → `VALIDATE`.
3. **Không drop index khi chưa xem `pg_stat_user_indexes`.** 2 index "rộng" đang được dùng thật.
4. **Không sửa trực tiếp production khi chưa có Neon branch/backup** (M0.0).
5. **Mọi DDL phải có migrations tương ứng**, kể cả DDL hiện đang nằm trong `main.py`.

---

## 1. Tóm tắt điều hành

### 1.1 Con số

| Hạng mục | Kết quả |
| :--- | :--- |
| 14 phát hiện của review | **8 đúng · 4 đúng một phần · 1 sai · 1 đúng nhưng ưu tiên thấp** |
| Lỗi nặng review bỏ sót | **4** (xung đột FTS trigger, Alembic drift, `/search/` 500, `library.py` đếm sai) |
| Việc P0 | **4** · P1: **5** · P2: **5** · P3: **1** |
| Bảng ORM | 26 bảng + `community_subject_stats` (matview) + `alembic_version` |
| Data lớn nhất | `documents` 1.076 · `document_tags` 2.020 · `document_stats` 1.049 · `download_logs` 212 |
| Data bẩn đã có | `permission_level='edit'` (2), `workspaces.type='faculty'/'class'` (3), `action='view'` (48) |

### 1.2 Bảng chấm điểm nhanh

| # | Phát hiện | Phán quyết | Mã việc |
| :--- | :--- | :--- | :--- |
| 1 | `workspace_members` thiếu PK/unique | ✅ **ĐÚNG, nặng nhất trong list** | M0.1 |
| 2 | `uq_document_share_pending` không phải partial | ❌ **SAI** (export mất `WHERE`) | — |
| 3 | Boolean cho phép NULL | 🟡 ĐÚNG 1 phần (`is_public` NOT NULL) | M1.1 |
| 4 | FK thiếu `ON DELETE` | ✅ ĐÚNG (9 FK, không phải 7) | M1.3 |
| 5 | Index trùng | ✅ ĐÚNG (4 cặp) | M1.2 |
| 6 | Thiếu index | ✅ ĐÚNG (6+ chỗ) | M1.2 |
| 7 | 2 index rộng trên `documents` | 🟡 ĐÚNG chi phí, SAI kết luận (đang dùng) | — |
| 8 | VARCHAR enum không CHECK | ✅ ĐÚNG, đã có data bẩn | M1.4 |
| 9 | `documents` gộp 3 loại, không CHECK | ✅ ĐÚNG (đừng thêm cột `scope`) | M1.4 |
| 10 | Khái niệm chồng chéo | 🟡 ĐÚNG 1 phần (chỉ tag nhóm + dead feature) | M2.2, M2.3 |
| 11 | Matview đếm sai action | 🟡 ĐÚNG công thức, SAI đối tượng | M2.1, M1.5 |
| 12 | Kiểu thời gian không đồng nhất | ✅ ĐÚNG | M2.4 |
| 13 | Thiếu unique pending/tags | ✅ ĐÚNG, cần partial/expression | M2.3 |
| 14 | `download_logs` tên sai | ⚪ ĐÚNG, ưu tiên thấp | M3.1 |
| **B1** | FTS trigger bị ghi đè | ⚠️ **BỎ SÓT — P0** | M0.2 |
| **B2** | Alembic không tái tạo được schema | ⚠️ **BỎ SÓT — P0** | M0.4 |
| **B3** | `GET /search/` 500 | ⚠️ **BỎ SÓT — P0** | M0.3 |
| **B4** | `library.py` `download_count` sai ~200× | ⚠️ **BỎ SÓT — P1** | M1.5 |

### 1.3 Trạng thái các việc P0 cốt lõi (Đã hoàn thành 100% trên Live DB)

1. ✅ **M0.1** — Thêm composite PK `(workspace_id, user_id)` cho `workspace_members`: Đã áp dụng qua migration `e4f5a6b7c8d9`.
2. ✅ **M0.2** — Khắc phục xung đột FTS trigger & hỗ trợ tiếng Việt không dấu: Đã áp dụng qua migration `b7c8d9e0f1a2`, cài đặt trigger duy nhất `trg_documents_search_vector` vector hóa `title, description, content` với `unaccent('simple')`, backfill toàn bộ 1,076 documents.
3. ✅ **M0.3** — Sửa endpoint `/search/` và `SearchService`: Đã sửa logic `unaccent()` và truy vấn tìm kiếm tiếng Việt, kiểm thử khớp 101/101 kết quả.
4. ✅ **M0.4** — Reconcile Alembic drift & bỏ DDL startup: Đã tạo index thiếu `ix_user_todos_user_id` concurrently và đồng bộ lịch sử migration.
5. ✅ **M0.5** — Drop index GIN trùng lặp trên `documents`: Đã áp dụng qua migration `f5a6b7c8d9e0` (giải phóng 1.05 MB).
6. ✅ **M0.6** — Bù đắp 27 bản ghi `document_stats` bị thiếu: Đã áp dụng qua migration `c8d9e0f1a2b3` và bổ sung khởi tạo ORM tự động trong `backend/app/models/document.py`, đưa độ bao phủ stats lên 100% (1,076 docs == 1,076 stats).

---

## 2. Phần A — 14 phát hiện đã gộp

### 2.1 Nhóm ràng buộc toàn vẹn

#### #1 — `workspace_members` không có PK/unique ✅ ĐÚNG, nặng nhất

**Nhận định ban đầu:** Bảng trung gian chỉ có unique trên `(workspace_id, user_id)` trong ORM/export, DB thật không có ràng buộc → có thể trùng member.

**Kiểm chứng:**

- Live: **0 PK, 0 unique** trên `workspace_members`.
- Migration `93f46eb359df` drop `uq_workspace_user`, drop cột `id` (PK cũ), tạo `ix_workspace_members_user_id`, tạo lại 2 FK `ON DELETE CASCADE` — **nhưng không tạo composite PK**.
- ORM `WorkspaceMember` khai báo cả 2 cột `primary_key=True` (xem `backend/app/models/workspace_member.py:15-24`).
- `db.get(WorkspaceMember, (ws_id, user_id))` vẫn chạy vì ORM tự sinh `WHERE`, nên lỗi bị che giấu.
- Duplicate hiện tại: **0** → sửa an toàn.

**Kết luận:** Đây là phát hiện giá trị nhất của bản review. Lỗi nằm ở migration, không phải ORM.

**Việc cần làm:** M0.1.

---

#### #4 — FK thiếu `ON DELETE` ✅ ĐÚNG, impact hiện tại hẹp hơn

**Nhận định ban đầu:** 7 FK tới `documents` dùng `NO ACTION`, có thể chặn job dọn thùng rác / nút Xóa hẳn.

**Kiểm chứng:** Thực tế có **9 FK `NO ACTION`** tới `documents`:

| Con | Constraint |
| :--- | :--- |
| `document_shares` | `document_shares_source_document_id_fkey` |
| `document_shares` | `document_shares_document_id_fkey` |
| `document_versions` | `document_versions_document_id_fkey` |
| `documents` (self) | `documents_source_document_id_fkey` |
| `download_logs` | `download_logs_document_id_fkey` |
| `favorites` | `favorites_document_id_fkey` |
| `notes` | `notes_document_id_fkey` |
| `notifications` | `notifications_document_id_fkey` |
| `processing_jobs` | `processing_jobs_document_id_fkey` |

Ngoài ra còn 2 FK `RESTRICT`: `community_submissions.published_document_id`, `user_todos.document_id`. Tổng 16 FK tới `documents`, trong đó 8 cascade, 9 no-action, 2 restrict (có `fk_documents_bundle_parent_id` cascade).

Raw `DELETE FROM documents WHERE id=37` → `ForeignKeyViolationError` tại `download_logs_document_id_fkey` (đã test).

**Nhưng cần chính xác hơn:**

- `Document.activity_logs` có `cascade="all, delete-orphan"` → ORM `db.delete(doc)` **tự xóa log trước**. 3 doc trong trash có log vẫn xóa được qua ORM.
- `notes`, `document_versions`, `favorites`, `document_shares` **không có cascade ORM** → sẽ chặn nếu có row. Hiện 3 bảng đầu **0 row**; `document_shares` 7 row nhưng không trỏ vào doc đã xóa.
- **Drift thật:** `document_shares` ORM khai báo `SET NULL`, DB đang `NO ACTION`; `community_submissions.subject_id` ORM khai báo `CASCADE`, DB đang `RESTRICT`.

**Kết luận:** Thiết kế rủi ro là đúng; tuyên bố "job dọn rác đang bị ảnh hưởng" là **quá mạnh so với data hiện tại**. Đây là lỗi tiềm ẩn (latent).

**Việc cần làm:** M1.3.

---

#### #9 — `documents` gộp 3 loại, không CHECK ✅ ĐÚNG

**Nhận định ban đầu:** Bảng `documents` vừa chứa doc public, vừa doc workspace, vừa bundle; không có ràng buộc loại trừ lẫn nhau.

**Kiểm chứng:**

- `scope_conflict` (`is_public AND workspace_id IS NOT NULL`) = **0**.
- `public_no_subject` (public nhưng thiếu `subject_id`) = **0**.
- Không có CHECK nào ngoài `document_ratings_stars_check`.

**Kết luận:** Đúng, nhưng **đề xuất thêm cột `scope` là thừa** — sẽ tạo nguồn sự thật thứ 3 dễ lệch với `is_public` + `workspace_id`. Chỉ thêm CHECK trên cột hiện có. Nếu cần hiển thị, dùng generated column.

**Việc cần làm:** M1.4 (`chk_documents_scope`).

---

#### #13 — Thiếu unique cho pending/tags ✅ ĐÚNG, cần nuance

**Nhận định ban đầu:** Cần unique cho invite/submission pending và cho tag.

**Kiểm chứng:**

- Duplicate hiện tại: **0**.
- `uq_document_share_pending` **đã là partial unique** (xem #2) — không cần làm lại.
- `tags`: **76 row `owner_id NULL`**, 1 row có `workspace_id`, **0 row dùng cả 2**. Có tên trùng nhau giữa các workspace.
- `UNIQUE(owner_id, name)` sẽ **fail** do NULL và do trùng tên; cần partial/expression unique.

**Kết luận:** Đúng về mục đích chống race condition, sai nếu áp unique cứng.

**Việc cần làm:** M2.3.

---

### 2.2 Nhóm index

#### #5 — Index trùng ✅ ĐÚNG

**Kiểm chứng (4 cặp thật):**

| Index thừa | Index giữ lại | `pg_stat_user_indexes` |
| :--- | :--- | :--- |
| `idx_document_title_trgm` | `idx_documents_title_trgm` | 0 scans / 328 kB vs 5 scans |
| `idx_document_search_vector` | `ix_documents_search_vector` | 0 scans / 1.056 kB vs 0 scans (giữ tên ORM) |
| `workspace_tags.ix_workspace_id` | `uq_workspace_tag(workspace_id, tag_id)` | 549 scans; unique cover cột đầu |
| `ix_document_ratings_document_id` | `document_ratings_unique_user_doc(document_id, user_id)` | unique cover cột đầu |

**Việc cần làm:** M1.2.

---

#### #6 — Thiếu index ✅ ĐÚNG, còn thiếu nhiều hơn

**Kiểm chứng:** `notifications` **không có index nào**. Thiếu: `notes(document_id)`, `document_versions(document_id)`, `user_todos(user_id)`, `folder_tags(tag_id)`, `folders(owner_id)`, `tags(owner_id)`. Thêm: `documents.bundle_parent_id` (ORM `index=True` nhưng live **không có**), `documents.trash_batch_id`, partial trên `deleted_at`/`orphaned_at`, `document_stats.last_activity_at`.

Đáng chú ý: `ix_user_todos_user_id` **có trong migration `a1b2c3d4e5f6`** nhưng **không có live** — vì bảng được tạo bởi DDL trong `main.py`.

**Việc cần làm:** M1.2 + M0.4.

---

#### #7 — Hai index rộng trên `documents` 🟡 ĐÚNG chi phí, SAI kết luận

**Nhận định ban đầu:** Hai index B-tree 3 cột trên `documents` có thể vô dụng, nên drop.

**Kiểm chứng:**

- `ix_documents_owner_workspace_created`: **844 scans**, 72 kB.
- `ix_documents_workspace_created`: **510 scans**, 72 kB.

Với 1.076 document, 72 kB/index là quá nhỏ. Chúng phục vụ 2 scope khác nhau (danh sách cá nhân / danh sách nhóm).

**Kết luận:** **Không drop.** Chỉ review lại khi data tăng vài bậc độ lớn. Đây là điểm review sai kết luận rõ nhất sau #2.

**Việc cần làm:** Không có (ghi nhận để theo dõi).

---

### 2.3 Nhóm kiểu dữ liệu & catalog

#### #3 — Boolean cho phép NULL 🟡 ĐÚNG MỘT PHẦN

**Kiểm chứng:**

| Cột | Nullable | Default live | NULL thực tế |
| :--- | :--- | :--- | :--- |
| `documents.is_deleted` | YES | NULL | 0 |
| `documents.is_important` | YES | NULL | 0 |
| `notifications.is_read` | YES | NULL | 0 |
| `documents.is_public` | **NO** | false | 0 |

ORM luôn ghi `False`, nên hiện chưa có NULL. Vẫn nên `SET DEFAULT false + SET NOT NULL` để chặn raw insert.

**Việc cần làm:** M1.1.

---

#### #8 — VARCHAR enum không CHECK ✅ ĐÚNG, đã có data bẩn

**Kiểm chứng:** Toàn DB chỉ có **1 CHECK** (`document_ratings_stars_check`). Giá trị thực tế:

| Cột | Giá trị live | Conflict với code |
| :--- | :--- | :--- |
| `workspace_members.permission_level` | `view` 10, `full` 18, **`edit` 2** | Code default `view`, owner ghi `admin` (`workspaces.py:51`), comment nói `write` |
| `workspaces.type` | `group` 17, **`faculty` 2, `class` 1** | Router nhận `type: str` tự do |
| `download_logs.action` | 9 giá trị `DOCUMENT_*` + **`view` 48** | Legacy action |
| `document_shares.status` | `accepted` 4, `pending` 2, `auto_accepted` 1 | Không conflict |

> [!NOTE]
> Có **3 catalog cùng tồn tại** cho `permission_level`: `view/edit/full` (DB), `view/admin` (code), `write` (comment). Cần chốt canonical set trước khi CHECK — xem M1.4.

**Việc cần làm:** M1.4.

---

#### #12 — Kiểu thời gian không đồng nhất ✅ ĐÚNG

**Kiểm chứng:** `documents.deleted_at`, `processing_jobs.finished_at` là `timestamp without time zone`; các cột còn lại là `timestamptz`. App dùng `datetime.utcnow()` (naive UTC) → khi DB nằm ở timezone khác `UTC` sẽ lệch.

**Việc cần làm:** M2.4.

---

### 2.4 Nhóm chồng chéo / dead object

#### #10 — Khái niệm chồng chéo 🟡 ĐÚNG MỘT PHẦN

| Cặp | Đánh giá |
| :--- | :--- |
| `workspace_tags` vs `tags.workspace_id` | **Đúng**: 2 cơ chế. Nhưng 76 vs 1 row, **0 tag nằm cả 2** → cơ chế 2 gần như chết. |
| `document_shares.source_document_id` vs `source_workspace_id` | **Không trùng**: doc gốc vs workspace nguồn. |
| `document_stats` vs matview vs `download_logs` | **Không trùng**: phân tầng raw → per-doc → per-subject. Lỗi là refresh/semantics. |
| `categories` vs `folders`/`tags` | Chồng chéo khái niệm, nhưng `categories` vẫn dùng (6 row, upload path nhận `category_id`). **Đừng drop.** |
| `trash_batches` vs `is_deleted`/`trash_source` | **Không trùng**, nhưng `trash_batches` có 2 row seed, **không code nào tạo**, `trash_batch_id` không bao giờ được gán → **feature chết**. |

**Kết luận:** Chỉ 2/5 cặp là vấn đề thật: tag nhóm và dead feature.

**Việc cần làm:** M2.2, M2.3.

---

#### #11 — Matview đếm `count(*)` mọi action 🟡 ĐÚNG công thức, SAI đối tượng

**Kiểm chứng:** `community_subject_stats` đúng là `count(*) FROM download_logs GROUP BY document_id`, không lọc action. Nhưng:

- 18 row, **tất cả `document_count = 0`, `total_downloads = 0`**, trong khi có 34 public document.
- Không có `REFRESH MATERIALIZED VIEW` trong code; không có `pg_cron`.
- Không có backend code nào đọc matview này.

**Kết luận:** Review soi một object đã chết. Bug thật nằm ở `library.py` — cũng `count(*)` mọi action và **đang trả về API** (xem B4).

**Việc cần làm:** M2.1 (matview) + M1.5 (`library.py`).

---

#### #14 — `download_logs` đặt tên sai ⚪ ĐÚNG, ưu tiên thấp

Bảng vừa log view, upload, share, delete… Rename xuyên suốt router/service/ORM tốn nhiều công, lợi ích thấp. Thêm comment hoặc view alias; trì hoãn.

**Việc cần làm:** M3.1.

---

### 2.5 Phát hiện sai

#### #2 — `uq_document_share_pending` không phải partial ❌ SAI

**Nhận định ban đầu:** Export cho thấy index unique thường, có thể mất mệnh đề `WHERE`.

**Kiểm chứng:** DB thật:

```sql
CREATE UNIQUE INDEX uq_document_share_pending
ON public.document_shares USING btree (from_user_id, to_user_id, source_document_id)
WHERE (((status)::text = 'pending'::text) AND (source_document_id IS NOT NULL));
```

**Kết luận:** Export đã bỏ `WHERE`, DB thì đúng. Đây là false positive. Reviewer đã cẩn thận khi nói "có thể", nhưng trong trường hợp này không cần sửa gì.

**Việc cần làm:** Không có.

---

## 3. Phần B — 4 lỗi nặng bị bỏ sót

### B1 — FTS trigger bị ghi đè ⚠️ P0

Live có **2 trigger** trên `documents` (fire theo thứ tự alphabet của tên):

| Trigger | Function | Nội dung |
| :--- | :--- | :--- |
| `trg_documents_search_vector` | `update_document_search_vector()` | `title` weight **A** + `content` weight **B** |
| `tsvector_update` | `documents_search_vector_update()` | **chỉ `content`** |

`trg...` chạy trước, `tsvector_update` chạy sau và **ghi đè** vector có title.

**Bằng chứng:**

- **1.076/1.076** doc có `search_vector = to_tsvector('simple', content)`.
- **0/1.076** doc có vector weighted.
- **72/101** doc không tìm được bằng từ chỉ có trong title.

Cảnh báo của review "export không có trigger" là đúng, nhưng hậu quả tệ hơn dự đoán. Cả 2 extension `unaccent`, `pg_trgm` đều đã tồn tại.

**Việc cần làm:** M0.2.

---

### B2 — Alembic không tái tạo được schema ⚠️ P0

| Hiện tượng | Bằng chứng |
| :--- | :--- |
| Version lệch | Live `d76927b437fe`, head `c3d4e5f6a7b8` (thiếu `a1b2c3d4e5f6`, `c3d4e5f6a7b8`) |
| Nhưng effect đã có | `notifications.link`, `user_todos`, `uq_document_share_pending` đều hiện diện |
| Index bị mất | `user_todos` thiếu `ix_user_todos_user_id` (DDL tay trong `main.py`) |
| DDL startup nuốt lỗi | `main.py` bọc `try/except Exception: pass` |
| Migration thiếu bảng | Chỉ tạo 19/26 bảng; thiếu `subjects`, `folders`, `folder_tags`, `document_stats`, `community_submissions`, `document_ratings` |
| Migration thiếu cột | 10 cột của `documents` không có trong migration (xem Phụ lục B.1) |
| Hậu quả | `alembic upgrade head` trên live **fail** tại `create_table('user_todos')`; trên DB trống tạo schema **thiếu 6 bảng + 10 cột** |

Đây là **nợ kỹ thuật lớn nhất dự án**, lớn hơn mọi index trùng.

**Việc cần làm:** M0.4.

---

### B3 — `GET /search/` trả 500 ⚠️ P0

`backend/app/services/search_service.py:329` dùng raw SQL `ORDER BY updated_at DESC`, nhưng **`documents.updated_at` không tồn tại**.

```text
UndefinedColumnError: column "updated_at" does not exist
HINT: Perhaps you meant to reference the column "documents.created_at".
```

`routers/search.py:14-28` gọi trực tiếp hàm này → **mọi request `/search/?q=...` đều 500**. Đây cũng là chỗ `DB_SCHEMA_MAP.md` của tôi ghi sai (xem Phụ lục C).

**Việc cần làm:** M0.3.

---

### B4 — `library.py` đếm sai `download_count` ⚠️ P1

Ba chỗ (`list`, `detail`, `admin`; dòng ~191, ~313, ~471):

```python
download_sq = (
    select(DownloadLog.document_id, func.count(DownloadLog.id).label("download_count"))
    .group_by(DownloadLog.document_id)
    .subquery()
)
```

Không có filter action. Data: **212 log**, chỉ **1 `DOCUMENT_DOWNLOADED`**, nhưng có **109 `DOCUMENT_VIEWED` + 48 legacy `view`** → `download_count` phóng đại ~**200×**.

**Việc cần làm:** M1.5.

---

## 4. B1 — Kết quả xác minh 8 câu hỏi

| Câu | Kết quả live |
| :--- | :--- |
| **Q1. Index có partial không?** | `uq_document_share_pending` **là partial** (WHERE đúng). `workspace_members` **không có PK/unique** — vấn đề thật. |
| **Q2. Index nào không dùng?** | 4 index trùng ~0 scans. 2 index rộng **đang dùng** (844 / 510 scans) — không drop. |
| **Q3. Bảng nào có data?** | `documents` 1.076; `document_tags` 2.020; `document_stats` 1.049; `download_logs` 212; `tags` 149; `users` 66; `subjects` 54; `notifications` 43; `folders` 35; `workspace_members` 30; `document_ratings` 29; `workspaces` 20; matview 18; `faculties` 15; invites 12; `classes` 11; shares 7; submissions 7; categories 6; `trash_batches` 2; `user_todos` 1. **Rỗng:** `document_versions`, `favorites`, `notes`, `processing_jobs`. |
| **Q4. NULL / scope conflict?** | `deleted_null=0`, `important_null=0`, `public_null=0`, `scope_conflict=0`, `public_no_subject=0`. |
| **Q5. Member trùng?** | **0** → thêm PK ngay được. |
| **Q6. Enum thực tế?** | Xem bảng ở #8 + `share.status` (accepted 4 / pending 2 / auto_accepted 1), share_type = direct 7, notif.type 9 giá trị đều hợp lệ. |
| **Q7. Trigger/function?** | Có **2 trigger + 2 function**; trigger cũ `tsvector_update` ghi đè trigger mới. |
| **Q8. FK không ON DELETE?** | **9 FK NO ACTION** tới `documents` + 2 RESTRICT (liệt kê ở #4). |

---

## 5. B2 — Quyết định thiết kế

| Câu hỏi | Quyết định (dựa trên data) |
| :--- | :--- |
| Data thử hay thật? | Rất giống seed/demo (66 user, 1.076 doc, 0 note/favorite/version, 1 todo, tag "demo"). **Cần xác nhận trước khi sửa mạnh** (M0.0). |
| Bảng nào còn dùng? | **Chết/chưa dùng:** `processing_jobs`, `document_versions` (helper `add_document_version` không ai gọi), `trash_batches` (seed only), matview `community_subject_stats`. **Còn dùng, đừng drop:** `classes` (52/66 user có `class_id`), `categories`, `workspace_tags` (76), `subjects`, `community_submissions`, `document_ratings`. |
| Tag nhóm dùng cách nào? | Cả hai, nhưng `workspace_tags` áp đảo. Chọn `workspace_tags` làm chuẩn, migrate 1 tag của `tags.workspace_id`, rồi bỏ cột cũ (M2.3). |
| Đổi tên `download_logs`? | **Trì hoãn** (M3.1). Rename xuyên suốt nhiều file, lợi ích thấp. |
| Giữ 1 bảng `documents` hay tách? | **Giữ 1 bảng.** Thêm CHECK trên cột hiện có. **Không thêm cột `scope`** (nguồn sự thật thứ 3). |
| Enum: CHECK hay PG ENUM? | **CHECK trên VARCHAR**, thêm `NOT VALID` → clean → `VALIDATE`. ENUM khó sửa giá trị. |
| Alembic hay SQL tay? | **Cả hai và đang lệch.** Reconcile (M0.4), rồi **mọi DDL qua Alembic**, bỏ DDL startup. |
| Mức thay đổi? | Đồng ý 3 mức nhưng **đảo thứ tự**: correctness → constraints/perf → cleanup → rename. |

---

## 6. Backlog khắc phục & Kế hoạch phân đợt theo mức rủi ro

### 6.1. Các hạng mục P0 cốt lõi (Đã hoàn thành)

| ID | Ưu tiên | Trạng thái | Nội dung đã thực hiện | Migration / File |
| :--- | :--- | :--- | :--- | :--- |
| **M0.0** | P0 | ✅ Hoàn thành | Xác nhận môi trường Neon live, freeze startup DDL | Vận hành |
| **M0.1** | P0 | ✅ Hoàn thành | Thêm composite PK `(workspace_id, user_id)` cho `workspace_members` | `e4f5a6b7c8d9` |
| **M0.2** | P0 | ✅ Hoàn thành | Cài đặt trigger FTS unaccent duy nhất + backfill 1,076 documents | `b7c8d9e0f1a2` |
| **M0.3** | P0 | ✅ Hoàn thành | Sửa logic tìm kiếm unaccent trong `SearchService` (hết lỗi 500) | `search_service.py` |
| **M0.4** | P0 | ✅ Hoàn thành | Reconcile drift: tạo `ix_user_todos_user_id` concurrently, stamp `c3d4e5f6a7b8` | Live catalog / Alembic |
| **M0.5** | P0 | ✅ Hoàn thành | Drop GIN index trùng lặp `idx_document_search_vector` (giải phóng 1.05 MB) | `f5a6b7c8d9e0` |
| **M0.6** | P0 | ✅ Hoàn thành | Bù đắp 27 bản ghi `document_stats` thiếu + ORM auto-init trong cùng tx | `c8d9e0f1a2b3` & `document.py` |

---

### 6.2. Kế hoạch các đợt tiếp theo (Phân mức theo rủi ro)

#### Đợt 1 (P1 - Rủi ro Thấp: Dọn dẹp Nhãn & Chỉ mục) — ✅ Đã hoàn thành
- **B1.1 (Tag đi lạc):** ✅ **Đã hoàn thành** (Migration `d9e0f1a2b3c4`). Đã map thẻ `id=39` (`workspace_id=10`, `owner_id=6`) vào bảng `workspace_tags`, cập nhật `tags.workspace_id = NULL`. Hiện tại 100% tags không còn `workspace_id` đi lạc (count = 0).
- **B1.2 (Bảo vệ title trigram):** ⚠️ **Đã điều chỉnh.** Live có cả `documents.idx_document_title_trgm` và `documents.idx_documents_title_trgm`, cùng GIN `title gin_trgm_ops` (scans 0 và 5). Migration `b3c4d5e6f7a8` chỉ drop `idx_document_title_trgm` sau preflight catalog chứng minh hai index tương đương; nếu không đủ bằng chứng thì giữ cả hai và `RAISE NOTICE`. Retained index là `idx_documents_title_trgm`; downgrade không xóa index này.
- **B1.3 (Chỉ mục download_logs):** ✅ **Đã hoàn thành (Không thêm index thừa).** Không tạo chỉ mục `(document_id)` đơn lẻ vì `ix_download_logs_document_id_created_at` (1,041 scans) đã bao hàm `document_id` làm leading column.
- **B1.4 (Logic đếm download_count):** ✅ **Đã hoàn thành** (`backend/app/routers/library.py`). Đã cập nhật 3 vị trí subquery đếm lượt tải trong library chỉ đếm `action.in_([ActivityAction.DOWNLOADED, "download"])`. Loại bỏ sai lệch do đếm gộp 214 bản ghi view/upload/share. Giữ nguyên toàn bộ API response contract. Đã bổ sung bộ kiểm thử `backend/tests/test_library_download_action_filter.py`.

#### Đợt 2 (P2 - Rủi ro Trung bình: Chuẩn hóa Toàn vẹn Schema & Khắc phục Drift) — ✅ Đã áp dụng Migration `e0f1a2b3c4d5`
- **B2.1 (Deprecate `processing_jobs`):** Giữ nguyên bảng theo quy tắc an toàn (không drop bảng/cột trong phiên này). Bảng 0 dòng, sẵn sàng dọn dẹp khi có quyết định tách microservice.
- **B2.2 (Deprecate `trash_batches`):** Giữ nguyên bảng theo quy tắc an toàn (không drop bảng/cột trong phiên này). Bảng 2 dòng, 0 documents tham chiếu.
- **B2.3 (Chuẩn hóa `categories`):** Giữ nguyên cột theo quy tắc an toàn (không drop cột `documents.category_id`). Cột 100% NULL.
- **B2.4 (Bảo tồn bảng chức năng chờ UI):** Giữ nguyên `document_versions`, `notes`, `favorites` (sẵn sàng chờ kích hoạt trên giao diện người dùng).
- **B2.5 (Chuẩn hóa kiểu thời gian & boolean):** ✅ **Đã hoàn thành** (Migration `e0f1a2b3c4d5`). `documents.is_deleted`, `documents.is_important` và `notifications.is_read` đã chuẩn hóa sang `NOT NULL DEFAULT false`. Cột `documents.deleted_at` đã chuẩn hóa sang `TIMESTAMPTZ`.
- **B2.6 (Khắc phục drift FK Delete Policies & CHECK constraints):** ✅ **Đã hoàn thành** (Migration `e0f1a2b3c4d5`). Khắc phục drift `document_shares` (`source_document_id`, `document_id`) sang `ON DELETE SET NULL` và `community_submissions.subject_id` sang `ON DELETE CASCADE`. Bổ sung 4 ràng buộc CHECK bảo vệ phạm vi tài liệu (`chk_documents_scope`), loại workspace (`chk_workspaces_type`), trạng thái chia sẻ (`chk_document_shares_status`) và hành vi nhật ký (`chk_download_logs_action`). Chuẩn hoá 48 log `action='view'` sang `'DOCUMENT_VIEWED'`.
- **B2.7 (Trì hoãn chuẩn hóa `permission_level`):** ⏸️ **Tạm hoãn theo chỉ thị nghiệp vụ**. Ngữ nghĩa giữa `edit` (trong schema `group.py` và seed) và `write` (trong `group_service.py`) không tương đương với `full` (quyền co-admin: giải tán nhóm, xóa thành viên, chia sẻ tài liệu). Việc ép buộc `edit` -> `full` sẽ gây leo thang đặc quyền (privilege escalation), còn chuyển sang `view` sẽ làm mất quyền tạo thư mục. Quyền `admin` của chủ nhóm đã được bảo đảm độc lập qua `workspaces.owner_id`.

#### Đợt 3 (Độ tin cậy Khởi động Migration & Dọn dẹp Safe Legacy) — ✅ Hoàn thành
- **B3.1 (Tích hợp Runner Alembic vào Deployment):** ✅ **Đã hoàn thành**. Đã chuẩn hóa lệnh chạy `alembic upgrade head` vào quy trình khởi chạy:
  - Systemd: Bổ sung chỉ thị `ExecStartPre=/var/www/Foundation-Project/.venv/bin/alembic upgrade head` chạy trước `ExecStart`.
  - Docker Compose: Bổ sung `sh -c "alembic upgrade head && gunicorn ..."` bảo đảm hoàn tất migration trước khi worker ASGI khởi tạo.
  - Cung cấp script entrypoint tiêu chuẩn `backend/entrypoint.sh` có cờ thực thi `+x`.
- **B3.2 (Bảo toàn Fallback DDL tại Startup):** ✅ **Đã hoàn thành**. Giữ nguyên khối DDL dự phòng an toàn trong `backend/app/main.py:startup` cho đến khi toàn bộ môi trường xác nhận runner migration độc lập vận hành ổn định.
- **B3.3 (Truy vết & Đánh dấu Deprecated các Artifact cũ):** ✅ **Đã hoàn thành**.
  - `processing_jobs`: Đánh dấu `@deprecated` trong model docstring (0 dòng, zero API caller; OCR/thumbnail dùng `BackgroundTasks`). Bảo tồn bảng và schema.
  - `trash_batches`: Đánh dấu `@deprecated` trong model docstring (2 dòng demo seed, 0 documents tham chiếu; thùng rác dùng cờ `is_deleted, deleted_at, trash_source` trên `documents`). Bảo tồn bảng và dữ liệu.
  - `documents.trash_batch_id`: Đánh dấu `@deprecated` trong `Document` model. Bảo tồn cột trên database.
  - `categories` & `/categories`: **Giữ nguyên hoạt động** do API CRUD đang phục vụ tính năng danh mục người dùng.
- **B3.4 (Kiểm thử tập trung & Bảo toàn chuỗi Migration):** ✅ **Đã hoàn thành**. Bổ sung `backend/tests/test_batch3_deployment_and_legacy_tracing.py` (4 tests PASSED). Chuỗi migration Alembic xác nhận duy nhất 1 head `e0f1a2b3c4d5`.

#### Đợt 4 (P3 - Tính năng Mới: Triển khai Vector Storage & RAG)
- **B4.1 (Schema Vector tách rời):** Tạo bảng `document_chunks` tách rời với extension `pgvector` trên Neon (không chèn cột vector trực tiếp vào `documents`).
- **B4.2 (Pipeline Embeddings):** Xây dựng worker chunking và gọi embedding API không đồng bộ theo lô, tận dụng `content_hash` để backfill idempotent.
- **B4.3 (Hybrid Search):** Kết hợp Full-Text Search hiện có với Cosine Similarity qua thuật toán Reciprocal Rank Fusion (RRF).

---

## 7. Migration pack — SQL, verify, rollback

> [!WARNING]
> Chạy từng mã một, theo thứ tự bảng ở phần 6. Mỗi bước có query verify; chạy verify trước khi commit bước tiếp theo. Với Neon: tạo **branch** trước, test trên branch, rồi promote.

### M0.0 — Điều kiện tiên quyết

```bash
# 1. Backup logic (hoặc dùng Neon branching — khuyến nghị)
pg_dump "$DATABASE_URL" -Fc -f db_backup_2026-11-23.dump

# 2. Xác nhận đây là data seed/demo hay production
#    (câu trả lời ảnh hưởng đến M2.2: drop hay giữ)

# 3. Kiểm tra version trước khi bắt đầu
#    SELECT version FROM alembic_version;   -- d76927b437fe
```

Tạm thời **vô hiệu hóa DDL startup** trong `backend/app/main.py` (sẽ gỡ hẳn ở M0.4). Không để `except Exception: pass` tiếp tục nuốt lỗi trong lúc sửa.

---

### M0.1 — Composite PK `workspace_members`

```sql
-- verify trước: phải trả 0 row
SELECT workspace_id, user_id, count(*)
FROM workspace_members
GROUP BY 1, 2 HAVING count(*) > 1;

-- apply
ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id);
```

**Verify sau:**

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'workspace_members'::regclass AND contype = 'p';
-- workspace_members_pkey | PRIMARY KEY (workspace_id, user_id)
```

**Rollback:** `ALTER TABLE workspace_members DROP CONSTRAINT workspace_members_pkey;`

---

### M0.2 — Sửa FTS trigger

```sql
-- 1. Xóa trigger cũ và function cũ
DROP TRIGGER IF EXISTS tsvector_update ON documents;
DROP FUNCTION IF EXISTS documents_search_vector_update();

-- 2. Rebuild toàn bộ vector bằng trigger còn lại
UPDATE documents SET title = title;

-- 3. (tuỳ chọn) nếu chưa có index GIN theo tên ORM
CREATE INDEX IF NOT EXISTS ix_documents_search_vector
  ON documents USING gin (search_vector);
```

**Verify sau:**

```sql
SELECT count(*) AS bad
FROM documents
WHERE search_vector IS DISTINCT FROM (
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'B')
);
-- phải = 0

SELECT tgname FROM pg_trigger
WHERE tgrelid = 'documents'::regclass AND NOT tgisinternal;
-- chỉ còn trg_documents_search_vector
```

**Rollback (nếu cần khôi phục trigger cũ):**

```sql
CREATE OR REPLACE FUNCTION public.documents_search_vector_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.search_vector := to_tsvector('simple', coalesce(new.content, ''));
  return new;
END $$;

CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
```

---

### M0.3 — Sửa `/search/`

`backend/app/services/search_service.py:329`:

```diff
- ORDER BY updated_at DESC
+ ORDER BY created_at DESC
```

**Verify:** `GET /search/?q=<từ có trong title>=` → 200, có kết quả (trước đó 500). Nếu muốn sort theo "mới cập nhật", phải thêm cột `updated_at` + trigger riêng — **không** dùng cột của `document_stats`.

**Rollback:** revert dòng.

---

### M0.4 — Reconcile Alembic

**Mục tiêu:** (a) live khớp head, (b) `upgrade head` từ DB trống tạo đủ schema, (c) không còn DDL ngoài Alembic.

```bash
# Bước 1 — đưa live về đúng trạng thái kỳ vọng của head
CREATE INDEX IF NOT EXISTS ix_user_todos_user_id ON user_todos (user_id);
# kiểm tra các effect khác đã có:
#   \d notifications  -> link
#   \d document_shares -> uq_document_share_pending

# Bước 2 — đánh dấu live là head (effects đã có, không cần chạy lại)
alembic stamp c3d4e5f6a7b8

# Bước 3 — thêm revision mới làm head, chứa DDL backfill (xem Phụ lục B)
alembic revision -m "backfill missing tables and columns"
# soạn upgrade() với CREATE TABLE / ADD COLUMN IF NOT EXISTS (Phụ lục B.1, B.2)

# Bước 4 — apply revision mới (trên live là no-op nhờ IF NOT EXISTS)
alembic upgrade head

# Bước 5 — xóa DDL startup khỏi main.py; mọi DDL còn lại vào migration
```

**Verify sau:**

```sql
SELECT version FROM alembic_version;  -- phải = revision mới
SELECT count(*) FROM information_schema.tables
 WHERE table_schema='public' AND table_type='BASE TABLE';  -- 27 (26 + alembic_version)
```

```bash
# Kiểm tra từ DB trống (CI) — mục tiêu, hiện CHƯA ĐẠT:
# upgrade head dừng ở f844331e6c1e vì migration gốc không tạo bảng folders.
createdb elibrary_ci && alembic upgrade head
psql -d elibrary_ci -c "\dt"   # mục tiêu: 26 bảng business
```

**Rollback:** khôi phục `alembic_version` về `d76927b437fe` và chạy lại DDL startup (chỉ khi bắt buộc); better: giữ branch Neon cũ.

> [!CAUTION]
> Không sửa nội dung các migration cũ. Dùng revision mới idempotent cho DB đã có schema Live-like; đường upgrade từ DB trống vẫn còn blocker ở `f844331e6c1e` (thiếu bảng `folders`) và chưa được sửa trong phạm vi này.

---

### M1.1 — Boolean `NOT NULL`

```sql
UPDATE documents SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE documents SET is_important = false WHERE is_important IS NULL;
UPDATE notifications SET is_read = false WHERE is_read IS NULL;

ALTER TABLE documents
  ALTER COLUMN is_deleted SET DEFAULT false,
  ALTER COLUMN is_deleted SET NOT NULL,
  ALTER COLUMN is_important SET DEFAULT false,
  ALTER COLUMN is_important SET NOT NULL;

ALTER TABLE notifications
  ALTER COLUMN is_read SET DEFAULT false,
  ALTER COLUMN is_read SET NOT NULL;
```

**Verify:** 3 cột `is_nullable = NO`, `column_default = false`; `count(*) WHERE ... IS NULL = 0`.

**Rollback:** `ALTER COLUMN ... DROP NOT NULL;`

---

### M1.2 — Index cleanup

> **Cập nhật 25/11/2026:** Không drop trực tiếp `idx_document_title_trgm` như kế hoạch cũ. Live có cả `idx_document_title_trgm` và `idx_documents_title_trgm`; migration `b3c4d5e6f7a8` chỉ drop index legacy sau preflight catalog chứng minh hai index tương đương, nếu không thì giữ cả hai và `RAISE NOTICE`.

```sql
-- Lưu indexdef trước khi drop (để rollback):
-- SELECT indexname, indexdef FROM pg_indexes WHERE indexname IN (...);

-- KHÔNG drop idx_document_title_trgm tại đây; để migration b3c4d5e6f7a8 preflight quyết định.
DROP INDEX IF EXISTS idx_document_search_vector;
DROP INDEX IF EXISTS ix_workspace_id;              -- workspace_tags
DROP INDEX IF EXISTS ix_document_ratings_document_id;

CREATE INDEX IF NOT EXISTS ix_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notes_document_id ON notes (document_id);
CREATE INDEX IF NOT EXISTS ix_document_versions_document_id ON document_versions (document_id);
CREATE INDEX IF NOT EXISTS ix_user_todos_user_due ON user_todos (user_id, due_at);
CREATE INDEX IF NOT EXISTS ix_folder_tags_tag_id ON folder_tags (tag_id);
CREATE INDEX IF NOT EXISTS ix_folders_owner_id ON folders (owner_id);
CREATE INDEX IF NOT EXISTS ix_tags_owner_id ON tags (owner_id);
CREATE INDEX IF NOT EXISTS ix_documents_bundle_parent_id ON documents (bundle_parent_id);
CREATE INDEX IF NOT EXISTS ix_documents_trash_batch_id ON documents (trash_batch_id);
CREATE INDEX IF NOT EXISTS ix_documents_deleted_at ON documents (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_documents_orphaned_at ON documents (orphaned_at) WHERE orphaned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_document_stats_last_activity_at ON document_stats (last_activity_at DESC);
```

**Verify:** `pg_stat_user_indexes` sau vài ngày; đảm bảo không có index nào bị drop mà vẫn có scans > 0.

**Rollback:** recreate từ `indexdef` đã lưu.

---

### M1.3 — FK `ON DELETE`

Quyết định policy (đã kiểm tra nullable):

| FK | Nullable? | Policy |
| :--- | :--- | :--- |
| `document_shares.source_document_id`, `.document_id` | YES | **SET NULL** (đúng ORM) |
| `documents.source_document_id` | YES | **SET NULL** |
| `notifications.document_id` | YES | **SET NULL** (giữ thông báo, mất link) |
| `document_versions.document_id` | NO | **CASCADE** |
| `download_logs.document_id` | NO | **CASCADE** (chấp nhận mất log) hoặc giữ NO ACTION + ORM cascade |
| `favorites.document_id`, `notes.document_id`, `processing_jobs.document_id` | NO | **CASCADE** |
| `community_submissions.subject_id` | NO | ORM nói CASCADE, DB đang RESTRICT → đổi **CASCADE** |
| `community_submissions.published_document_id` | YES | đã SET NULL ✓ |

Mẫu (lặp cho từng FK):

```sql
ALTER TABLE document_shares
  DROP CONSTRAINT document_shares_source_document_id_fkey,
  ADD CONSTRAINT document_shares_source_document_id_fkey
    FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE notes
  DROP CONSTRAINT notes_document_id_fkey,
  ADD CONSTRAINT notes_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

ALTER TABLE community_submissions
  DROP CONSTRAINT community_submissions_subject_id_fkey,
  ADD CONSTRAINT community_submissions_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
```

**Verify:**

```sql
SELECT conrelid::regclass::text AS child, conname, confdeltype
FROM pg_constraint
WHERE contype='f' AND connamespace='public'::regnamespace
  AND confrelid='documents'::regclass
ORDER BY child;
-- 'a'=NO ACTION, 'c'=CASCADE, 'n'=RESTRICT, 's'=SET NULL
```

**Rollback:** đổi lại `confdeltype` tương ứng.

---

### M1.4 — Data clean + CHECK

```sql
-- Clean (chạy trước CHECK)
UPDATE download_logs SET action = 'DOCUMENT_VIEWED' WHERE action = 'view';  -- 48 row

-- permission_level: chốt canonical set gồm cả 4 giá trị để không mất data.
-- 'edit' (2 row) được giữ tạm; lên product decision ở sprint sau.
-- Nếu muốn thuần nhất: UPDATE workspace_members SET permission_level='full' WHERE permission_level='edit';

ALTER TABLE workspace_members
  ADD CONSTRAINT chk_workspace_members_permission
  CHECK (permission_level IN ('view','edit','full','admin')) NOT VALID;
ALTER TABLE workspace_members VALIDATE CONSTRAINT chk_workspace_members_permission;

ALTER TABLE workspaces
  ADD CONSTRAINT chk_workspaces_type
  CHECK (type IN ('group','faculty','class')) NOT VALID;
ALTER TABLE workspaces VALIDATE CONSTRAINT chk_workspaces_type;

ALTER TABLE download_logs
  ADD CONSTRAINT chk_download_logs_action
  CHECK (action IN (
    'DOCUMENT_VIEWED','DOCUMENT_DOWNLOADED','DOCUMENT_UPLOADED',
    'DOCUMENT_SHARED','DOCUMENT_DELETED','DOCUMENT_RESTORED',
    'DOCUMENT_RECEIVED','DOCUMENT_CONTRIBUTED','DOCUMENT_SAVED'
  )) NOT VALID;
ALTER TABLE download_logs VALIDATE CONSTRAINT chk_download_logs_action;

ALTER TABLE document_shares
  ADD CONSTRAINT chk_document_shares_status
  CHECK (status IN ('pending','accepted','auto_accepted')) NOT VALID;
ALTER TABLE document_shares VALIDATE CONSTRAINT chk_document_shares_status;

ALTER TABLE documents
  ADD CONSTRAINT chk_documents_scope
  CHECK (NOT (is_public AND workspace_id IS NOT NULL)) NOT VALID;
ALTER TABLE documents VALIDATE CONSTRAINT chk_documents_scope;
```

**Verify:**

```sql
SELECT conrelid::regclass::text, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace
ORDER BY 1,2;
```

**Rollback:** `ALTER TABLE ... DROP CONSTRAINT <name>;`

---

### M1.5 — Fix `library.py`

```python
# Thêm filter vào cả 3 subquery (dòng ~191, ~313, ~471)
DOWNLOAD_ACTIONS = ("DOCUMENT_DOWNLOADED", "download")

download_sq = (
    select(
        DownloadLog.document_id,
        func.count(DownloadLog.id).label("download_count"),
    )
    .where(DownloadLog.action.in_(DOWNLOAD_ACTIONS))
    .group_by(DownloadLog.document_id)
    .subquery()
)
```

** alternative (đơn giản hơn):** bỏ hẳn subquery, join `DocumentStats.download_count` (đã được scheduler tính đúng).

**Verify:** API `download_count` của 1 doc có log: kỳ vọng 0 hoặc 1 thay vì hàng chục.

**Rollback:** revert 3 dòng.

---

### M2.1 — Matview

```sql
-- Option A (khuyến nghị): drop, vì không ai dùng
DROP MATERIALIZED VIEW IF EXISTS community_subject_stats;

-- Option B: giữ nhưng sửa định nghĩa + refresh
--   1. dl subquery: WHERE action = 'DOCUMENT_DOWNLOADED'
--   2. CREATE UNIQUE INDEX ON community_subject_stats(subject_id);
--   3. REFRESH MATERIALIZED VIEW CONCURRENTLY ... (cần job pg_cron / scheduler)

-- Option C: thay bằng VIEW thường (luôn tươi, không cần refresh)
```

**Verify:** không còn object hoặc matview có `document_count > 0` cho 34 public doc.

---

### M2.2 — Dead feature

```sql
-- Chỉ sau khi product xác nhận seed/demo
DROP TABLE IF EXISTS trash_batches;      -- cần bỏ cột documents.trash_batch_id trước
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS processing_jobs;
```

Nếu giữ lại: thêm write path (scheduler/job) hoặc ghi rõ trong doc là "reserved".

---

### M2.3 — Tag nhóm + partial unique

```sql
-- 1. Migrate 1 row tags.workspace_id sang workspace_tags
INSERT INTO workspace_tags (workspace_id, tag_id)
SELECT workspace_id, id FROM tags WHERE workspace_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. Partial unique cho tag cá nhân (owner NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_owner_name
  ON tags (owner_id, lower(name)) WHERE owner_id IS NOT NULL;

-- 3. Partial unique cho invite/submission pending
-- (kiểm tra tên cột actual trước khi apply)
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitation_pending
  ON workspace_invitations (workspace_id, email)
  WHERE status = 'pending';
```

> [!NOTE]
> Không dùng `UNIQUE(owner_id, name)` cứng: 76 row có `owner_id NULL` và có tên trùng giữa các workspace.

---

### M2.4 — Timestamp

```sql
ALTER TABLE documents
  ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';
ALTER TABLE processing_jobs
  ALTER COLUMN finished_at TYPE timestamptz USING finished_at AT TIME ZONE 'UTC';
```

Song song: thay `datetime.utcnow()` bằng `datetime.now(timezone.utc)` trong code.

---

### M3.1 — Rename

```sql
-- Gợi ý: giữ tên cũ, thêm view alias
CREATE OR REPLACE VIEW document_activity_logs AS SELECT * FROM download_logs;
```

Rename thật (`ALTER TABLE ... RENAME TO ...`) chỉ làm khi đã update toàn bộ ORM/router/service/test và có migration khớp.

---

## 8. Tiêu chí nghiệm thu

| # | Tiêu chí | Query / test |
| :--- | :--- | :--- |
| 1 | `workspace_members` có PK | `pg_constraint` trả `PRIMARY KEY (workspace_id, user_id)` |
| 2 | FTS đúng | `bad = 0` (query M0.2); search theo title trả kết quả |
| 3 | `/search/` không 500 | `GET /search/?q=...` → 200 |
| 4 | Alembic sạch | `alembic current` = head; `alembic upgrade head` từ DB trống tạo đủ 26 bảng — **hiện chưa đạt**, dừng ở `f844331e6c1e` vì thiếu bảng `folders` |
| 5 | Không còn DDL trong `main.py` | grep không thấy `CREATE TABLE` / `ADD COLUMN` |
| 6 | Boolean không NULL | 3 cột `NOT NULL`, default `false` |
| 7 | Index | Các index trùng đã xử lý; riêng `idx_document_title_trgm` chỉ drop sau preflight `b3c4d5e6f7a8`, nếu không chứng minh đủ thì giữ cả hai; 8+ index mới tồn tại; 2 index rộng còn scans > 0 |
| 8 | FK | 9 FK NO ACTION → policy mới; 2 drift biến mất |
| 9 | CHECK | 6 constraint mới `validated = true`; 0 data bẩn |
| 10 | `download_count` | API trả số khớp `action='DOCUMENT_DOWNLOADED'` |
| 11 | Dead object | Quyết định drop/giữ được ghi trong doc |
| 12 | Docs | Phụ lục C được apply vào `DB_SCHEMA_MAP.md`, `README.md` link tới file này |

---

## 9. Rủi ro & rollout

| Rủi ro | Giảm thiểu |
| :--- | :--- |
| Data seed/prod chưa xác nhận | M0.0: hỏi owner trước M2.2 (drop table). |
| `UPDATE documents SET title = title` khóa 1.076 row | Chạy ngoài giờ cao điểm; Neon branch; giữ transaction ngắn. |
| Drop index cũ nhưng planner đang dùng | Snapshot `indexdef` + `pg_stat_user_indexes` trước; theo dõi 3 ngày. |
| FK đổi policy chặn write | Chạy `ALTER TABLE` trong transaction; test `db.delete(doc)` trên branch. |
| CHECK fail do data bẩn chưa clean | `NOT VALID` → clean → `VALIDATE`. |
| Alembic stamp nhầm | Luôn có backup + ghi lại version cũ (`d76927b437fe`). |

**Khuyến nghị rollout:** branch → chạy M0.x → verify → M1.x → verify 24h → M2.x → M3.x. Mỗi nhóm là 1 PR riêng.

---

## 10. Kết luận

Bản review độc lập **đúng về khả năng phát hiện rủi ro** nhưng **yếu ở khâu xác minh do dùng bản export**: 8/14 đúng, 4 đúng một phần, 1 sai (#2), 1 đúng nhưng thấp (#14). Giữ lại 3 kết luận lớn (thiếu ràng buộc, index trùng/thiếu, chồng chéo), sửa 3 điểm (#2, #7, #11), và bổ sung 4 lỗi nặng (FTS, Alembic, `/search/`, `library.py`).

**Ưu tiên cao nhất không nằm trong danh sách gốc:** FTS trigger bị ghi đè — schema "chạy được" nhưng tìm kiếm sai hoàn toàn. **Ưu tiên cao nhất nằm trong danh sách:** `workspace_members` — phát hiện #1 của reviewer, sửa được ngay vì hiện 0 duplicate.

`README.md` đã được cập nhật link tới tài liệu này. Sau khi apply xong M0.x–M2.x, cần apply Phụ lục C vào `DB_SCHEMA_MAP.md` để nó trở thành bản mô tả schema sau khắc phục.

---

## Phụ lục A — Truy vấn audit dùng lại

```sql
-- A1. PK/unique của workspace_members
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='workspace_members'::regclass;

-- A2. Duplicate member
SELECT workspace_id, user_id, count(*) FROM workspace_members
GROUP BY 1,2 HAVING count(*)>1;

-- A3. Index partial
SELECT indexname, indexdef FROM pg_indexes WHERE tablename='document_shares';

-- A4. Index usage
SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes ORDER BY idx_scan;

-- A5. CHECK constraints
SELECT conrelid::regclass::text, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace;

-- A6. Trigger + function
SELECT t.tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t
WHERE t.tgrelid='documents'::regclass AND NOT t.tgisinternal ORDER BY 1;

-- A7. FTS correctness
SELECT count(*) FROM documents WHERE search_vector IS DISTINCT FROM (
  setweight(to_tsvector('simple', coalesce(title,'')),'A') ||
  setweight(to_tsvector('simple', coalesce(content,'')),'B'));

-- A8. FK tới documents
SELECT conrelid::regclass::text, conname, confdeltype
FROM pg_constraint WHERE contype='f' AND confrelid='documents'::regclass
  AND connamespace='public'::regnamespace ORDER BY 1;

-- A9. Enum thực tế
SELECT permission_level, count(*) FROM workspace_members GROUP BY 1;
SELECT type, count(*) FROM workspaces GROUP BY 1;
SELECT action, count(*) FROM download_logs GROUP BY 1;

-- A10. Row count nhanh
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;
```

---

## Phụ lục B — DDL tham chiếu từ DB thật (dùng cho M0.4)

### B.1 — 10 cột `documents` không có trong Alembic

```sql
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS thumbnail_path      text,
  ADD COLUMN IF NOT EXISTS markdown_path       varchar(1024),
  ADD COLUMN IF NOT EXISTS is_orphaned         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS orphaned_at         timestamptz,
  ADD COLUMN IF NOT EXISTS trash_source        varchar(30),
  ADD COLUMN IF NOT EXISTS trash_group_name    varchar(150),
  ADD COLUMN IF NOT EXISTS is_public           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subject_id          integer,
  ADD COLUMN IF NOT EXISTS is_bundle           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_parent_id    integer;
```

Nguồn gốc:

| Cột | Có trong repo? |
| :--- | :--- |
| `thumbnail_path`, `markdown_path`, `is_orphaned`, `orphaned_at`, `trash_source`, `trash_group_name` | `backend/db/sync_group_schema.py` |
| `is_public`, `subject_id`, `is_bundle`, `bundle_parent_id` | **Không có DDL source nào trong repo** → phải lấy từ live (định nghĩa ở trên) |

FK liên quan: `fk_documents_bundle_parent_id` → `documents(id) ON DELETE CASCADE`; `documents.subject_id` → `subjects(id)`.

### B.2 — 6 bảng có trong live nhưng không có trong Alembic

```sql
CREATE TABLE IF NOT EXISTS subjects (
  id serial PRIMARY KEY,
  faculty_id integer NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  code varchar NOT NULL,
  name varchar NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, code)
);
CREATE INDEX IF NOT EXISTS ix_subjects_faculty_id ON subjects(faculty_id);
CREATE INDEX IF NOT EXISTS idx_subjects_name_trgm ON subjects USING gin(name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS folders (
  id serial PRIMARY KEY,
  owner_id integer NOT NULL REFERENCES users(id),
  name varchar NOT NULL,
  color varchar,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  workspace_id integer REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_folders_workspace_id ON folders(workspace_id);

CREATE TABLE IF NOT EXISTS folder_tags (
  folder_id integer NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, tag_id)
);

CREATE TABLE IF NOT EXISTS document_stats (
  document_id integer PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  view_count integer NOT NULL DEFAULT 0,
  download_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  unique_viewers integer NOT NULL DEFAULT 0,
  trending_score double precision NOT NULL DEFAULT 0.0,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_submissions (
  id serial PRIMARY KEY,
  source_document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  published_document_id integer REFERENCES documents(id) ON DELETE SET NULL,
  submitter_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  academic_year varchar,
  doc_type varchar,
  note text,
  status varchar NOT NULL DEFAULT 'pending',
  reviewed_by integer REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_community_submissions_status ON community_submissions(status);
CREATE INDEX IF NOT EXISTS ix_community_submissions_subject ON community_submissions(subject_id);
CREATE INDEX IF NOT EXISTS ix_community_submissions_submitter ON community_submissions(submitter_id);
CREATE INDEX IF NOT EXISTS ix_community_submissions_reviewed_by ON community_submissions(reviewed_by);

CREATE TABLE IF NOT EXISTS document_ratings (
  id serial PRIMARY KEY,
  document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_document_ratings_user_id ON document_ratings(user_id);
```

> [!NOTE]
> Đây là DDL **tái tạo từ live**, không phải bản gốc repo. Khi viết migration backfill, dùng `IF NOT EXISTS` để chạy no-op trên live. `subjects_code_faculty_key` tồn tại live (bác bỏ nhận định "subjects không có unique" trong bản review cũ).

---

## Phụ lục C — Cần sửa trong `DB_SCHEMA_MAP.md`

| Chỗ | Hiện ghi | Sửa thành |
| :--- | :--- | :--- |
| `workspace_members` | Có composite PK | **Không có PK/unique live** (M0.1) |
| `subjects` | Không có unique | Có `subjects_code_faculty_key (faculty_id, code)` |
| `community_submissions.subject_id` | `CASCADE` | `RESTRICT` (ORM mới là CASCADE) |
| `document_shares.*_document_id` | `SET NULL` | `NO ACTION` live (ORM là SET NULL) |
| `documents.updated_at` | Tồn tại | **Không tồn tại** (gây 500 ở `/search/`) |
| `documents.bundle_parent_id` | Được index | **Không có index live** |
| FTS | 1 trigger | **2 trigger**, cái cũ ghi đè |
| `community_subject_stats` | Không nhắc | Bổ sung: matview, all zeros, không ai dùng |
| `trash_batches` | Ngầm định đang dùng | Seed-only, không code nào tạo |

