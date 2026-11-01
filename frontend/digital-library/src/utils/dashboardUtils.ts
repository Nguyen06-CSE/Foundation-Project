// frontend/digital-library/src/utils/dashboardUtils.ts

import type { QueryClient } from "@tanstack/react-query";

/**
 * Làm mới dữ liệu thống kê tổng hợp của trang cá nhân (/personal)
 * Gọi hàm này trong onSuccess của các mutation làm thay đổi số liệu tài liệu,
 * thùng rác, yêu thích, nhóm, hoặc chia sẻ.
 */
export const invalidateDashboard = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
};
