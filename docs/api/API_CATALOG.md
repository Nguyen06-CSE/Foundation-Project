---
title: Danh Mục Điểm Cuối API
sidebar_label: 📋 Danh mục Endpoint
sidebar_position: 5
---

# Danh Mục Điểm Cuối API (API Catalog)

Tài liệu này đóng vai trò chỉ mục tra cứu toàn diện cho **128 endpoints** được cung cấp bởi hệ thống Backend FastAPI. Các endpoints được phân nhóm logic theo từng mô-đun chức năng nghiệp vụ.

> 💡 **Lưu ý**: Để xem chi tiết các trường Request Body, Query Schema và Response JSON cụ thể cho từng endpoint, vui lòng tham khảo file chuẩn [openapi.yaml](./openapi.yaml) hoặc truy cập giao diện tương tác `/docs` khi chạy backend local.

---

## 1. 🔐 Xác Thực & Quản Lý Người Dùng (Auth & Users)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Đăng ký tài khoản mới (`register`) | Public | Implemented |
| `POST` | `/auth/login` | Đăng nhập hệ thống & cấp JWT (`login`) | Public | Implemented |
| `GET` | `/auth/me` | Lấy thông tin tài khoản hiện tại (`get_me`) | Bearer Token | Implemented |
| `GET` | `/users/me` | Xem hồ sơ cá nhân đầy đủ (`read_me`) | Bearer Token | Implemented |
| `PATCH` | `/users/me` | Cập nhật hồ sơ (họ tên, thông tin) (`update_me`) | Bearer Token | Implemented |
| `PATCH` | `/users/me/password` | Đổi mật khẩu (`update_password`) | Bearer Token | Implemented |
| `GET` | `/users/search` | Tìm kiếm người dùng theo tên/email (`search_users`) | Bearer Token | Implemented |

---

## 2. 📄 Quản Lý Tài Liệu Cá Nhân (Documents & Versions)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/documents/upload` | Tải lên tài liệu đơn lẻ (`upload_document`) | Bearer Token | Implemented |
| `POST` | `/documents/upload-batch` | Tải lên nhiều tài liệu hàng loạt (`upload_batch_documents`) | Bearer Token | Implemented |
| `GET` | `/documents/` | Danh sách tài liệu cá nhân có phân trang, lọc (`list_documents`) | Bearer Token | Implemented |
| `GET` | `/documents/file-types` | Thống kê số lượng theo định dạng file (`get_document_file_types`) | Bearer Token | Implemented |
| `GET` | `/documents/{doc_id}` | Xem chi tiết metadata tài liệu (`get_document`) | Bearer Token | Implemented |
| `GET` | `/documents/{doc_id}/activities` | Nhật ký hoạt động của tài liệu (`get_document_activities`) | Bearer Token | Implemented |
| `GET` | `/documents/{doc_id}/stats` | Thống kê lượt xem, tải, thích (`get_document_stats_endpoint`) | Bearer Token | Implemented |
| `GET` | `/documents/{doc_id}/file` | Tải xuống file gốc (`get_document_file`) | Bearer Token | Implemented |
| `GET` | `/documents/{doc_id}/raw` | Xem nội dung raw (văn bản/markdown) (`get_document_raw`) | Bearer Token | Implemented |
| `GET` | `/documents/{doc_id}/tags` | Danh sách tag gắn với tài liệu (`get_document_tags`) | Bearer Token | Implemented |
| `PATCH` | `/documents/{doc_id}` | Cập nhật thông tin tài liệu (`update_document`) | Owner / Bearer | Implemented |
| `PUT` | `/documents/{doc_id}/tags` | Cập nhật toàn bộ tags của tài liệu (`update_document_tags`) | Owner / Bearer | Implemented |
| `DELETE` | `/documents/{doc_id}/tags/{tag_id}` | Xóa 1 tag khỏi tài liệu (`remove_document_tag`) | Owner / Bearer | Implemented |
| `PATCH` | `/documents/{doc_id}/thumbnail` | Cập nhật hoặc đổi thumbnail (`update_document_thumbnail`) | Owner / Bearer | Implemented |
| `DELETE` | `/documents/{doc_id}` | Chuyển tài liệu vào thùng rác (`soft_delete_document`) | Owner / Bearer | Implemented |
| `POST` | `/documents/bulk-delete` | Xóa mềm nhiều tài liệu cùng lúc (`bulk_soft_delete_documents`) | Owner / Bearer | Implemented |
| `POST` | `/documents/bulk-download` | Tải về nhiều tài liệu dạng file ZIP (`bulk_download_documents_zip`) | Bearer Token | Implemented |
| `GET` | `/documents/{doc_id}/children` | Danh sách tài liệu con trong bundle (`get_bundle_children`) | Bearer Token | Implemented |
| `POST` | `/documents/{bundle_id}/add-files` | Tải thêm file trực tiếp vào bundle (`add_files_to_bundle`) | Owner / Bearer | Implemented |
| `POST` | `/documents/{bundle_id}/add-from-personal` | Gom tài liệu cá nhân có sẵn vào bundle (`add_from_personal_to_bundle`) | Owner / Bearer | Implemented |
| `DELETE` | `/documents/{bundle_id}/children/{doc_id}` | Gỡ tài liệu con khỏi bundle (`remove_from_bundle`) | Owner / Bearer | Implemented |
| `GET` | `/documents/{bundle_id}/download-zip` | Nén và tải toàn bộ bundle về dạng ZIP (`download_bundle_zip`) | Bearer Token | Implemented |
| `GET` | `/document-versions/{document_id}` | Lịch sử phiên bản của tài liệu (`get_document_versions`) | Bearer Token | Implemented |

---

## 3. 📁 Quản Lý Cây Thư Mục (Folders)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/folders/` | Danh sách cây thư mục cá nhân (`list_folders`) | Bearer Token | Implemented |
| `POST` | `/folders/` | Tạo thư mục mới (`create_folder`) | Bearer Token | Implemented |
| `GET` | `/folders/{folder_id}` | Chi tiết thư mục & tài liệu bên trong (`get_folder`) | Bearer Token | Implemented |
| `PATCH` | `/folders/{folder_id}` | Đổi tên, di chuyển thư mục cha (`update_folder`) | Owner / Bearer | Implemented |
| `DELETE` | `/folders/{folder_id}` | Xóa thư mục (`delete_folder`) | Owner / Bearer | Implemented |
| `POST` | `/folders/{folder_id}/tags` | Gắn tag cho thư mục (`add_tags_to_folder`) | Owner / Bearer | Implemented |
| `DELETE` | `/folders/{folder_id}/tags/{tag_id}` | Gỡ tag khỏi thư mục (`remove_tag_from_folder`) | Owner / Bearer | Implemented |
| `GET` | `/folders/workspaces/{workspace_id}/folders` | Thư mục thuộc workspace (`list_workspace_folders`) | Member / Bearer | Implemented |
| `POST` | `/folders/workspaces/{workspace_id}/folders` | Tạo thư mục trong workspace (`create_workspace_folder`) | Member / Bearer | Implemented |

---

## 4. 🏛️ Thư Viện Cộng Đồng & Học Thuật (Community Library & Academics)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/library/faculties/` | Danh sách các Khoa (`get_faculties`) | Public / Optional | Implemented |
| `POST` | `/library/faculties/` | Tạo mới Khoa đào tạo (`create_faculty`) | Faculty/Global Admin | Implemented |
| `PATCH` | `/library/faculties/{faculty_id}` | Cập nhật thông tin Khoa (`update_faculty`) | Faculty/Global Admin | Implemented |
| `GET` | `/library/faculties/{faculty_id}/subjects/` | Môn học thuộc Khoa (`get_subjects_by_faculty`) | Public / Optional | Implemented |
| `POST` | `/library/faculties/{faculty_id}/subjects/` | Thêm môn học vào Khoa (`create_subject`) | Faculty/Global Admin | Implemented |
| `PATCH` | `/library/subjects/{subject_id}` | Cập nhật thông tin môn học (`update_subject`) | Faculty/Global Admin | Implemented |
| `DELETE` | `/library/subjects/{subject_id}` | Xóa môn học (`delete_subject`) | Faculty/Global Admin | Implemented |
| `GET` | `/library/subjects/{subject_id}/documents/` | Tài liệu theo môn học (`get_documents_by_subject`) | Public / Optional | Implemented |
| `GET` | `/library/documents/{doc_id}` | Chi tiết tài liệu cộng đồng (`get_community_document`) | Public / Optional | Implemented |
| `GET` | `/library/documents/{doc_id}/download` | Tải tài liệu cộng đồng (`download_community_document`) | Public / Optional | Implemented |
| `GET` | `/library/search` | Tìm kiếm trong thư viện cộng đồng (`search_community_documents`) | Public / Optional | Implemented |
| `GET` | `/library/documents/{doc_id}/ratings` | Đánh giá & bình luận tài liệu (`get_document_ratings`) | Public | Implemented |
| `POST` | `/library/documents/{doc_id}/ratings` | Gửi đánh giá sao & nhận xét (`create_or_update_rating`) | Bearer Token | Implemented |
| `PATCH` | `/library/documents/{doc_id}/ratings/{rating_id}` | Sửa đánh giá (`update_rating`) | Owner / Bearer | Implemented |
| `DELETE` | `/library/documents/{doc_id}/ratings/{rating_id}` | Xóa đánh giá (`delete_rating`) | Owner / Bearer | Implemented |
| `POST` | `/library/documents/{doc_id}/save-to-personal` | Lưu tài liệu cộng đồng về kho cá nhân (`save_community_document_to_personal`) | Bearer Token | Implemented |
| `POST` | `/library/submit` | Gửi duyệt tài liệu lên thư viện cộng đồng (`submit_document_to_library`) | Bearer Token | Implemented |
| `POST` | `/library/submit-bulk` | Gửi duyệt hàng loạt (`submit_documents_bulk_to_library`) | Bearer Token | Implemented |
| `GET` | `/library/my-submissions` | Danh sách yêu cầu gửi duyệt của tôi (`get_my_submissions`) | Bearer Token | Implemented |
| `GET` | `/library/admin/submissions` | Danh sách yêu cầu chờ duyệt (`get_admin_submissions`) | Faculty/Global Admin | Implemented |
| `GET` | `/library/admin/submissions/{submission_id}` | Chi tiết yêu cầu duyệt (`get_admin_submission_detail`) | Faculty/Global Admin | Implemented |
| `POST` | `/library/admin/submissions/{submission_id}/approve` | Phê duyệt tài liệu lên thư viện (`approve_submission`) | Faculty/Global Admin | Implemented |
| `POST` | `/library/admin/submissions/{submission_id}/reject` | Từ chối yêu cầu gửi duyệt (`reject_submission`) | Faculty/Global Admin | Implemented |
| `GET` | `/academics/faculties` | Danh sách Khoa chuyên môn (`get_faculties`) | Bearer Token | Implemented |
| `GET` | `/academics/classes` | Danh sách Lớp học chuyên ngành (`get_classes`) | Bearer Token | Implemented |

---

## 5. 👥 Nhóm & Không Gian Hợp Tác (Groups & Workspaces)

Router `groups` cung cấp 48 endpoints phục vụ làm việc nhóm, trao đổi học liệu và phân quyền:

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/groups/` | Tạo nhóm học tập mới (`create_group`) | Bearer Token | Implemented |
| `GET` | `/groups/` | Danh sách nhóm tôi tham gia (`list_groups`) | Bearer Token | Implemented |
| `GET` | `/groups/{group_id}` | Xem chi tiết thông tin nhóm (`get_group`) | Member / Bearer | Implemented |
| `PATCH` | `/groups/{group_id}` | Cập nhật thông tin nhóm (`update_group`) | Group Admin | Implemented |
| `DELETE` | `/groups/{group_id}` | Giải tán nhóm (`dissolve_group`) | Group Owner | Implemented |
| `GET` | `/groups/{group_id}/documents` | Danh sách tài liệu trong nhóm (`list_group_documents`) | Member / Bearer | Implemented |
| `GET` | `/groups/{group_id}/documents/{document_id}` | Xem tài liệu nhóm (`get_group_document`) | Member / Bearer | Implemented |
| `POST` | `/groups/{group_id}/documents/upload` | Tải tài liệu lên nhóm (`upload_group_document`) | Member (Write) | Implemented |
| `POST` | `/groups/{group_id}/documents/upload-batch` | Tải hàng loạt lên nhóm (`upload_group_batch_documents`) | Member (Write) | Implemented |
| `POST` | `/groups/{group_id}/documents/share` | Chia sẻ tài liệu cá nhân vào nhóm (`share_documents`) | Member (Write) | Implemented |
| `POST` | `/groups/{group_id}/folders/share` | Chia sẻ thư mục vào nhóm (`share_folder`) | Member (Write) | Implemented |
| `POST` | `/groups/{group_id}/documents/{document_id}/save-to-personal` | Sao chép tài liệu nhóm về kho cá nhân (`save_group_document_to_personal`) | Member / Bearer | Implemented |
| `DELETE` | `/groups/{group_id}/documents/{document_id}` | Xóa tài liệu nhóm (`delete_group_document`) | Admin/Owner | Implemented |
| `POST` | `/groups/{group_id}/documents/bulk-delete` | Xóa hàng loạt tài liệu nhóm (`bulk_delete_group_documents`) | Admin/Owner | Implemented |
| `POST` | `/groups/{group_id}/documents/bulk-download` | Tải ZIP nhiều tài liệu nhóm (`bulk_download_group_documents`) | Member / Bearer | Implemented |
| `GET` | `/groups/{group_id}/members` | Danh sách thành viên nhóm (`list_members`) | Member / Bearer | Implemented |
| `PATCH` | `/groups/{group_id}/members/{user_id}/permission` | Phân quyền thành viên (`update_member_permission`) | Group Admin | Implemented |
| `DELETE` | `/groups/{group_id}/members/{user_id}` | Xóa thành viên khỏi nhóm (`remove_member`) | Group Admin | Implemented |
| `POST` | `/groups/{group_id}/transfer-owner` | Chuyển quyền Trưởng nhóm (`transfer_owner`) | Group Owner | Implemented |
| `POST` | `/groups/{group_id}/leave` | Rời khỏi nhóm (`leave_group`) | Member / Bearer | Implemented |
| `POST` | `/groups/{group_id}/invitations` | Mời 1 thành viên vào nhóm (`invite_member`) | Group Admin | Implemented |
| `POST` | `/groups/{group_id}/invitations/bulk` | Mời nhiều thành viên theo danh sách (`invite_members_bulk`) | Group Admin | Implemented |
| `GET` | `/groups/{group_id}/invitations/sent` | Danh sách lời mời đã gửi (`list_sent_invitations`) | Group Admin | Implemented |
| `DELETE` | `/groups/{group_id}/invitations/{invitation_id}` | Thu hồi lời mời (`cancel_invitation`) | Group Admin | Implemented |
| `GET` | `/groups/invitations/me` | Lời mời gia nhập gửi đến tôi (`list_my_invitations`) | Bearer Token | Implemented |
| `POST` | `/groups/invitations/{invitation_id}/accept` | Chấp nhận tham gia nhóm (`accept_invitation`) | Bearer Token | Implemented |
| `POST` | `/groups/invitations/{invitation_id}/reject` | Từ chối tham gia nhóm (`reject_invitation`) | Bearer Token | Implemented |
| `GET` | `/groups/{group_id}/folders` | Danh sách thư mục trong nhóm (`list_group_folders`) | Member / Bearer | Implemented |
| `POST` | `/groups/{group_id}/folders` | Tạo thư mục nhóm (`create_group_folder`) | Member (Write) | Implemented |
| `GET` | `/groups/{group_id}/trash` | Thùng rác của nhóm (`list_group_trash`) | Member / Bearer | Implemented |
| `POST` | `/groups/{group_id}/trash/{document_id}/restore` | Khôi phục tài liệu nhóm (`restore_group_document`) | Admin/Owner | Implemented |
| `GET` | `/groups/{group_id}/tags` | Thẻ tag của nhóm (`list_group_tags`) | Member / Bearer | Implemented |
| `POST` | `/groups/{group_id}/tags` | Tạo tag nhóm (`create_group_tag`) | Member / Bearer | Implemented |

---

## 6. 🔗 Chia Sẻ Tài Liệu Trực Tiếp (Document Sharing)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/shares/preview` | Xem trước thông tin trước khi chia sẻ (`preview_share`) | Bearer Token | Implemented |
| `GET` | `/shares/document-status` | Kiểm tra trạng thái chia sẻ của 1 tài liệu (`get_document_share_status`) | Bearer Token | Implemented |
| `POST` | `/shares` | Tạo yêu cầu chia sẻ tài liệu cho cá nhân/vai trò (`create_share`) | Bearer Token | Implemented |
| `GET` | `/shares/received` | Danh sách tài liệu được chia sẻ cho tôi (`list_received_shares`) | Bearer Token | Implemented |
| `GET` | `/shares/pending` | Danh sách chia sẻ đang chờ tôi duyệt (`list_pending_shares`) | Bearer Token | Implemented |
| `GET` | `/shares/sent` | Danh sách tài liệu tôi đã gửi chia sẻ (`list_sent_shares`) | Bearer Token | Implemented |
| `POST` | `/shares/{share_id}/accept` | Chấp nhận tài liệu chia sẻ (`accept_share`) | Recipient | Implemented |
| `POST` | `/shares/{share_id}/reject` | Từ chối tài liệu chia sẻ (`reject_share`) | Recipient | Implemented |
| `DELETE` | `/shares/{share_id}` | Thu hồi tài liệu đã chia sẻ (`withdraw_share`) | Sender | Implemented |

---

## 7. 🔍 Tìm Kiếm Toàn Văn (Search)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/search/` | Tìm kiếm tổng hợp theo từ khóa, lọc theo loại, khoa, tag (`search`) | Optional Bearer | Implemented |
| `GET` | `/search/quick` | Gợi ý nhanh tiêu đề phục vụ thanh tìm kiếm tức thì (`quick_search`) | Optional Bearer | Implemented |
| `GET` | `/search/full` | Tìm kiếm toàn văn trong nội dung (PostgreSQL Full-text Search) (`full_text_search`) | Optional Bearer | Implemented |

---

## 8. 🏷️ Thẻ Phân Loại & Chuyên Mục (Tags & Categories)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tags/` | Danh sách thẻ tag cá nhân (`list_tags`) | Bearer Token | Implemented |
| `GET` | `/tags/stats` | Thống kê số lượng tài liệu theo từng tag (`list_tags_with_stats`) | Bearer Token | Implemented |
| `GET` | `/tags/name/{name}` | Lấy chi tiết tag theo tên (`get_tag_by_name`) | Bearer Token | Implemented |
| `POST` | `/tags/` | Tạo thẻ tag mới (`create_tag`) | Bearer Token | Implemented |
| `POST` | `/tags/merge` | Gộp 2 tag thành 1 (`merge_tags`) | Bearer Token | Implemented |
| `PATCH` | `/tags/{tag_id}` | Đổi tên hoặc màu sắc tag (`update_tag`) | Bearer Token | Implemented |
| `DELETE` | `/tags/{tag_id}` | Xóa thẻ tag (`delete_tag`) | Bearer Token | Implemented |
| `GET` | `/categories/` | Danh mục chuyên ngành chung (`list_categories`) | Public | Implemented |
| `POST` | `/categories/` | Tạo chuyên mục mới (`create_category`) | Admin | Implemented |
| `PATCH` | `/categories/{category_id}` | Đổi tên chuyên mục (`update_category`) | Admin | Implemented |
| `DELETE` | `/categories/{category_id}` | Xóa chuyên mục (`delete_category`) | Admin | Implemented |

---

## 9. 📝 Ghi Chú, Yêu Thích & Lịch Sử Tải (Notes, Favorites, Logs)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/notes/` | Danh sách ghi chú cá nhân (`list_notes`) | Bearer Token | Implemented |
| `POST` | `/notes/` | Tạo ghi chú đính kèm tài liệu (`create_note`) | Bearer Token | Implemented |
| `PATCH` | `/notes/{note_id}` | Cập nhật nội dung ghi chú (`update_note`) | Owner / Bearer | Implemented |
| `DELETE` | `/notes/{note_id}` | Xóa ghi chú (`delete_note`) | Owner / Bearer | Implemented |
| `GET` | `/favorites/` | Danh sách tài liệu yêu thích của tôi (`list_favorites`) | Bearer Token | Implemented |
| `POST` | `/favorites/` | Đánh dấu yêu thích 1 tài liệu (`add_favorite`) | Bearer Token | Implemented |
| `DELETE` | `/favorites/{document_id}` | Bỏ thích tài liệu (`remove_favorite`) | Bearer Token | Implemented |
| `GET` | `/download-logs/` | Lịch sử các lần tải tài liệu của tôi (`get_my_download_logs`) | Bearer Token | Implemented |

---

## 10. 🗑️ Thùng Rác (Trash) & 🔔 Thông Báo (Notifications)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/trash/` | Danh sách tài liệu cá nhân trong thùng rác (`list_trash`) | Bearer Token | Implemented |
| `POST` | `/trash/{document_id}/restore` | Khôi phục tài liệu về kho cá nhân (`restore_document`) | Owner / Bearer | Implemented |
| `DELETE` | `/trash/{document_id}/purge` | Xóa vĩnh viễn tài liệu và tệp lưu trữ R2 (`hard_delete_document`) | Owner / Bearer | Implemented |
| `GET` | `/notifications/` | Danh sách thông báo (`list_notifications`) | Bearer Token | Implemented |
| `GET` | `/notifications/unread-count` | Số lượng thông báo chưa đọc (`get_unread_count`) | Bearer Token | Implemented |
| `POST` | `/notifications/mark-all-read` | Đánh dấu tất cả thông báo là đã đọc (`mark_all_as_read`) | Bearer Token | Implemented |
| `PATCH` | `/notifications/{notification_id}/read` | Đánh dấu 1 thông báo là đã đọc (`mark_as_read`) | Bearer Token | Implemented |
| `DELETE` | `/notifications/{notification_id}` | Xóa thông báo (`delete_notification`) | Bearer Token | Implemented |

---

## 11. 📊 Dashboard & ✅ Kế Hoạch Cá Nhân (Todos)

| Phương thức | Đường dẫn (Path) | Tên thao tác / Nghiệp vụ | Yêu cầu xác thực | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/summary` | Tổng hợp thống kê nhanh cho Dashboard (`read_dashboard_summary`) | Bearer Token | Implemented |
| `GET` | `/stats/me` | Thống kê số lượng tài liệu, dung lượng sử dụng (`get_my_stats`) | Bearer Token | Implemented |
| `GET` | `/todos/` | Danh sách công việc/nhắc nhở cá nhân (`list_todos`) | Bearer Token | Implemented |
| `POST` | `/todos/` | Tạo công việc/nhắc nhở mới gắn với tài liệu/hạn nộp (`create_todo`) | Bearer Token | Implemented |
| `PATCH` | `/todos/{todo_id}` | Cập nhật công việc, đánh dấu hoàn thành (`update_todo`) | Bearer Token | Implemented |
| `DELETE` | `/todos/{todo_id}` | Xóa công việc (`delete_todo`) | Bearer Token | Implemented |
| `GET` | `/health` | Kiểm tra tình trạng máy chủ (`health_check`) | Public | Implemented |
