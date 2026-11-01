-- docs/feat/personal-dashboard/migration.sql
-- Chỉ mục tối ưu hóa cho trang /personal (Personal Dashboard)
-- LƯU Ý: File này dùng để chạy thủ công trên PostgreSQL/Neon DB. KHÔNG tự động chạy.

-- 1. Tối ưu truy vấn tài liệu cá nhân, đếm tài liệu hoạt động, dung lượng và thùng rác
-- Khối cần: Khối 2.3 (thùng rác sắp hết hạn), Khối 3.1 (tổng doc cá nhân + doc mới 7 ngày), 
--            Khối 3.2 (dung lượng), Khối 4 (mở gần đây), Khối 5 (trending cá nhân)
CREATE INDEX IF NOT EXISTS idx_documents_owner_workspace
  ON documents (owner_id, workspace_id, is_deleted);

-- 2. Tối ưu truy vấn tài liệu trong các workspace nhóm
-- Khối cần: Khối 3.3 (đếm tài liệu chia sẻ), Khối 7 (đếm tổng tài liệu trong các nhóm)
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id
  ON documents (workspace_id) WHERE workspace_id IS NOT NULL;

-- 3. Tối ưu truy vấn danh mục thư mục cá nhân
-- Khối cần: Khối 6 (thư mục cá nhân)
CREATE INDEX IF NOT EXISTS idx_folders_owner_id
  ON folders (owner_id) WHERE workspace_id IS NULL;
