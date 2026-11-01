// frontend/digital-library/src/services/dashboardService.ts

import api from "@/services/api";
import type { DashboardSummary } from "@/types/dashboard";

export const dashboardService = {
  getSummary: (): Promise<DashboardSummary> =>
    api.get<DashboardSummary>("/dashboard/summary").then((res) => res.data),
};
