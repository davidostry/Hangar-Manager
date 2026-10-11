import type { AircraftStatus } from "./aircraft";

export interface DashboardSummary {
  total_aircraft: number;
  aircraft_by_status: Record<AircraftStatus, number>;
  open_maintenance_reports: number;
  overdue_inspections: number;
}