# Kế hoạch cải tiến Kho học liệu cộng đồng

## 1. Mục tiêu và phạm vi

Tài liệu này chuyển prototype “Studocu Style” thành kế hoạch triển khai phù hợp với ứng dụng hiện tại. Mục tiêu là giúp người học tìm được tài liệu nhanh hơn, hiểu chất lượng/nội dung trước khi mở, và đưa các thao tác đóng góp/lưu tài liệu đến đúng vị trí.

**Giới hạn đã thống nhất:** đợt này không thay đổi schema hoặc dữ liệu DB và không mở rộng backend/API. Ưu tiên UI/UX dùng các API đã có; tính năng cần trường dữ liệu hay endpoint mới chỉ ghi nhận cho giai đoạn sau, không giả lập thành chức năng thật. Có thể dùng mock data cục bộ khi cần dựng giao diện, nhưng phải ghi rõ là mẫu và không trộn với số liệu thật.

Phạm vi sản phẩm hiện có là kho công khai theo cấu trúc **Khoa → Môn học → Tài liệu**, không phải một trang tổng hợp mọi không gian cá nhân/nhóm/lớp/trường.

## 2. Đánh giá nhanh

Prototype có các điểm UX hữu ích: lối tắt khám phá theo khoa/môn, tìm kiếm và lọc, sắp xếp tài liệu, lưu tài liệu, xem chi tiết, đánh giá và trang theo dõi đóng góp. Tuy nhiên, nó là demo độc lập với state và dữ liệu cứng, không phải mã có thể chép nguyên vào ứng dụng. Prototype đang dùng một shell riêng, màu/font khác design system, nhiều nút chưa có hành vi thật và có các số liệu/điểm thưởng chưa được xác nhận.

Đặc tả và code hiện tại đã có các route `/library`, `/library/faculty/:facultyId`, `/library/subject/:subjectId`, `/library/document/:documentId`; service đã có tìm kiếm, lọc/sắp xếp, lấy đánh giá, lưu vào kho cá nhân, gửi đóng góp và lịch sử đóng góp. Vì vậy trọng tâm nên là cải thiện các màn hình hiện hữu và trạng thái tương tác, không dựng lại prototype hoặc thêm route trùng lặp.

## 3. Đánh giá từng đề xuất

| Đề xuất trong prototype | Đánh giá | Hướng xử lý trong phạm vi hiện tại |
|---|---|---|
| Nút đóng góp trên header mọi trang | Hữu ích nhưng header hiện tại dùng cho toàn ứng dụng; thêm CTA toàn cục có thể gây nhiễu ngoài Kho học liệu. | Đặt CTA ở các trang Kho học liệu và trang chi tiết/môn học. Dẫn đến luồng chọn tài liệu cá nhân để gửi duyệt đã có. Không đổi header toàn hệ thống trong đợt này. |
| Chuông báo duyệt/từ chối/đánh giá | Loại thông báo duyệt đã có kiểu dữ liệu/hạ tầng chung; thông báo bình luận/đánh giá có thể cần mở rộng. | Không thiết kế thêm hệ thống thông báo. Có thể dùng thông báo duyệt hiện có nếu đang được hiển thị; xác minh bằng code trước khi triển khai. |
| Liên kết kho cá nhân/đóng góp | Kho cá nhân có route hiện hữu; lịch sử đóng góp có API/service và màn hình phù hợp cần xác minh route. | Thêm liên kết trong menu tài khoản hoặc CTA theo ngữ cảnh, dùng route hiện tại. Không tạo bản sao trang quản lý đóng góp. |
| Tìm toàn cục từ trang chủ, gợi ý tìm kiếm | Tìm kiếm kho hiện có cho môn/tài liệu; điều hướng `/library/search` trong prototype cần được đối chiếu route thật. | Dùng `libraryService.search` và tích hợp kết quả vào một route đã tồn tại hoặc bổ sung xử lý trong trang hiện tại nếu route chưa có. Không hứa tìm khoa nếu API hiện không trả khoa. Gợi ý chỉ dùng danh sách tĩnh có nhãn gợi ý hoặc bỏ qua. |
| Tài liệu nổi bật/mới cập nhật | Mới cập nhật có thể suy ra từ API danh sách/sắp xếp mới nhất. “Nổi bật” cần cờ hoặc quy tắc/xếp hạng chưa xác nhận. | Ưu tiên một dải “Mới cập nhật” dùng API hiện có nếu tải được dữ liệu mà không tạo nhiều request. Tạm hoãn “Nổi bật” đến khi thống nhất tiêu chí. |
| Bảng vàng người đóng góp, điểm thưởng | Cần tổng hợp thống kê, kỳ thời gian, quy tắc điểm và dữ liệu tác giả. Dữ liệu hardcode trong demo không đáng tin. | Để ngoài phạm vi; không hiển thị số điểm, thứ hạng hoặc lời hứa thưởng chưa có quy tắc và nguồn dữ liệu. |
| Ẩn/gom khoa chưa có dữ liệu | Có thể làm người dùng không biết phạm vi hệ thống. Số đếm khoa có thể có sẵn từ API. | Giữ tất cả khoa; sắp xếp khoa có tài liệu trước nếu count sẵn có. Khoa rỗng phải có thông điệp/CTA đóng góp, không làm mờ hoặc biến mất mặc định. |
| Theo dõi/ghim môn học | Hữu ích nhưng cần lưu trạng thái người dùng; chưa thấy API tương ứng. | Hoãn thao tác đồng bộ. Nếu thật sự cần trong demo, dùng localStorage và mô tả rõ chỉ lưu trên thiết bị; ưu tiên thấp. |
| Lọc nhóm môn đại cương/cơ sở/chuyên ngành | Schema/API hiện tại có thể chưa cung cấp nhóm môn. | Không thêm bộ lọc đến khi có trường dữ liệu. |
| Thumbnail trang đầu, số trang, giảng viên | Một phần không có trong contract hiện tại; số trang/preview cần xử lý file hoặc metadata mới. | Dùng icon định dạng đã có và metadata hiện trả về. Không dựng thumbnail giả hoặc gán giảng viên cứng. Có thể cải thiện cách trình bày thẻ với các trường sẵn có. |
| Bộ điều khiển PDF, toàn màn hình | Hữu ích nếu đã có preview PDF thật; prototype không chứng minh viewer hoạt động. | Trước tiên sửa trạng thái preview trống và xác định khả năng xem file hiện có. Điều khiển trang/zoom chỉ làm nếu thư viện/viewer hiện tại hỗ trợ; không thêm thư viện/backend trong đợt này. |
| Báo cáo vi phạm | Cần API, quy trình xử lý và chính sách. | Hoãn; không để nút giả. |
| Tài liệu liên quan/cùng môn | Có thể suy ra từ danh sách cùng môn, nhưng sẽ cần thêm request hoặc truyền dữ liệu. | Ưu tiên thấp; chỉ làm nếu tái sử dụng danh sách đang tải được với chi phí hợp lý. |
| Chia sẻ link/copy link | Không cần schema/API mới. | Có thể triển khai bằng Web Share API hoặc copy URL hiện tại, kèm fallback và phản hồi thành công/lỗi. QR để sau. |
| Đánh giá sao/bình luận | API đọc/ghi đánh giá đã có. | Giữ trong phạm vi, nhưng cần trạng thái đã đăng nhập, sửa/xóa đánh giá của mình và trạng thái chưa có đánh giá. Không hardcode số lượt/nhận xét. |
| Đóng góp tài liệu, duyệt và lịch sử | API submit, submit hàng loạt, lịch sử cá nhân và luồng admin đã tồn tại. | Dùng tài liệu trong kho cá nhân làm nguồn submit theo payload hiện tại; không dùng form upload độc lập trong prototype vì nó không khớp contract. UI phải thể hiện pending/approved/rejected theo dữ liệu thật. |

## 4. Kế hoạch triển khai đề nghị

### Giai đoạn 1 — Làm rõ luồng và giảm ma sát (ưu tiên cao)

1. **Trang `/library`:** làm rõ tiêu đề và mô tả; đặt ô tìm kiếm nổi bật; hiển thị khoa có tài liệu trước dựa trên count hiện có; giữ khoa rỗng với trạng thái rỗng và lời mời đóng góp phù hợp.
2. **Trang khoa:** tìm/lọc môn phía client; card môn không hiển thị sao rỗng khi chưa có đánh giá; dùng `avg_rating` chỉ khi có tài liệu/điểm thực; trạng thái không có môn/tài liệu rõ ràng.
3. **Trang môn:** làm CTA đóng góp ngay cạnh tiêu đề; tận dụng lọc loại tài liệu/năm học và sort hiện có; hiển thị lượt tải/điểm đánh giá nếu response hiện tại cung cấp; ưu tiên bố cục dễ quét hơn thay cho tăng kích thước card một cách máy móc.
4. **Trang chi tiết:** ưu tiên nội dung, định dạng, môn/khoa và hành động chính; làm rõ trạng thái preview không khả dụng; dùng đánh giá thật; thêm chia sẻ/copy link có phản hồi; “Lưu vào cá nhân” phải xử lý khách chưa đăng nhập và kết quả API.
5. **Đóng góp:** đưa người dùng tới luồng chọn tài liệu đã có, cho xem môn/năm học/loại/note trước khi gửi; sau submit dẫn tới lịch sử đóng góp hiện có và hiển thị trạng thái từ server.

### Giai đoạn 2 — Tinh chỉnh và khả năng sử dụng

- Rà soát responsive, loading, lỗi API, trạng thái rỗng và thao tác bàn phím cho bốn route Kho học liệu.
- Chuẩn hóa CTA, thông tin meta và thứ bậc nội dung; tái sử dụng component hiện có (`Button`, `Card`, `Badge`, `FileIcon`, `EmptyState`, các component library) thay vì viết lại component tương tự.
- Cân nhắc khối “Mới cập nhật” nếu service/API hiện tại cung cấp đủ dữ liệu mà không cần thêm endpoint; nếu chưa, để backlog.

### Ngoài phạm vi đợt này

- Thay đổi DB/schema, migrations, endpoint mới hoặc mở rộng payload để thêm cột.
- Bảng xếp hạng/điểm thưởng, theo dõi môn đồng bộ, bình luận thông báo, báo cáo vi phạm.
- QR, metadata trang/thumbnail mới, xếp hạng “nổi bật” chưa có tiêu chí.
- Thay shell/layout toàn ứng dụng hoặc sao chép nguyên prototype.

## 5. Ràng buộc thiết kế và cách triển khai

- Tuân thủ `docs/design/DESIGN_SYSTEM.md`, dùng token/theme và component trong `docs/COMPONENTS.md`; không lấy palette slate/emerald và font mặc định trong prototype làm chuẩn.
- Route thật được liệt kê trong `docs/specs/COMMUNITY_LIBRARY.md`; `docs/SCREENS.md` hiện chưa liệt kê các route Kho học liệu, vì vậy người triển khai cần cập nhật tài liệu màn hình nếu quy trình dự án yêu cầu.
- Tách mỗi màn hình theo đúng cấu trúc hiện có trong `digital-library/src/pages/library/`; không tạo app state riêng kiểu `currentView` thay cho React Router.
- Giữ service `libraryService` và React Query; không gọi API mới. Phân biệt dữ liệu thật với mock rõ ràng.
- Prototype có thể dùng làm tài liệu tham khảo về thứ tự nội dung và ý tưởng tương tác; không copy nguyên code vì dùng dữ liệu cứng, class màu không theo token, type lỏng và nhiều nút chưa có hành vi.

## 6. Tiêu chí nghiệm thu

- Người dùng có thể đi từ trang Kho đến tài liệu qua khoa/môn, hoặc tìm tài liệu theo API hiện hữu.
- Các bộ lọc/sắp xếp không làm mất trạng thái đang chọn; loading, lỗi và không có kết quả đều có giao diện rõ.
- Không xuất hiện số liệu giả về rating, download, trang, điểm thưởng, bảng xếp hạng hoặc trạng thái duyệt.
- Người dùng có thể lưu tài liệu, gửi đánh giá và gửi đóng góp qua các API hiện có; lỗi quyền/mạng được phản hồi rõ.
- Tài liệu đã gửi hiển thị lịch sử và trạng thái server; thao tác chia sẻ link có fallback nếu trình duyệt không hỗ trợ Web Share.
- Bố cục dùng đúng design system và hoạt động trên màn hình hẹp.

## 7. Ghi chú cho người nhận triển khai

Trước khi bắt đầu, kiểm tra code hiện tại của từng route và response thực tế của API để xác nhận trường dữ liệu. Nếu đề xuất nào cần dữ liệu chưa được API trả về, bỏ trường đó khỏi UI hoặc để backlog; không tự thêm cột DB/API trong phạm vi kế hoạch này. Ưu tiên hoàn thành Giai đoạn 1 trước, sau đó mới cân nhắc Giai đoạn 2.
