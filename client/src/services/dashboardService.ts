import api from "./api";

import type { DashboardSummary } from "../types/dashboard";

const USE_MOCK_DATA =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_MOCK_DATA === "true";

const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  total_aircraft: 24,
  aircraft_by_status: {
    Available: 16,
    Maintenance: 4,
    Inspection: 2,
    Grounded: 2,
  },
  open_maintenance_reports: 7,
  overdue_inspections: 3,
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (USE_MOCK_DATA) {
    return { ...MOCK_DASHBOARD_SUMMARY };
  }

  const response = await api.get<DashboardSummary>(
    "/dashboard/summary",
  );

  return response.data;
}