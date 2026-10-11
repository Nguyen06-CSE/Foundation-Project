// src/components/shared/documents/DocumentDetail/tabs/TabPanels.tsx

/**
 * TabDescription - Hiển thị mô tả chi tiết của tài liệu
 */
export function TabDescription({ description }: { description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Mô tả chi tiết
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

/**
 * TabNote - Ghi chú cá nhân của người dùng về tài liệu
 */
export function TabNote() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Ghi chú cá nhân
      </h3>
      <textarea
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        rows={6}
        placeholder="Nhập ghi chú của bạn về tài liệu này..."
      />
    </div>
  );
}

/**
 * TabActivity - Lịch sử hoạt động tương tác với tài liệu
 */
export function TabActivity() {
  const activities = [
    { action: "Tải lên", time: "10 phút trước", user: "Tôi" },
    { action: "Xem", time: "2 giờ trước", user: "Nguyễn Văn A" },
    { action: "Tải xuống", time: "Hôm qua", user: "Trần Thị B" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Lịch sử hoạt động
      </h3>
      {activities.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
        >
          <div>
            <span className="font-medium text-gray-800">{a.user}</span>
            <span className="text-gray-500">
              {" "}
              đã {a.action.toLowerCase()} tài liệu
            </span>
          </div>
          <span className="text-xs text-gray-400">{a.time}</span>
        </div>
      ))}
    </div>
  );
}
