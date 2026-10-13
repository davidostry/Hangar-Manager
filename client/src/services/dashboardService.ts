
import api from "./api";

import type { DashboardSummary } from "../types/dashboard";

// ========================================
// BACKEND RESPONSE TYPE
// ========================================

// Defines the response structure returned by FastAPI
interface DashboardApiResponse {
  aircraft: {
    total: number;
    by_status: DashboardSummary["aircraft_by_status"];
  };

  maintenance: {
    total: number;
    active: number;
    critical_active: number;
    by_status: {
      Open: number;
      InProgress: number;
      Resolved: number;
      Cancelled: number;
    };
  };

  inspections: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    overdue: number;
    upcoming_30_days: number;
  };
}

// ========================================
// GET DASHBOARD SUMMARY
// ========================================

export async function getDashboardSummary(): Promise<DashboardSummary> {

  // Fetch dashboard statistics from the Backend
  const response = await api.get<DashboardApiResponse>(
    "/dashboard/summary",
  );

  const { aircraft, maintenance, inspections } = response.data;

  // Convert the Backend response to the Frontend format
  return {
    total_aircraft: aircraft.total,

    aircraft_by_status: aircraft.by_status,

    open_maintenance_reports: maintenance.active,

    overdue_inspections: inspections.overdue,
  };
}
