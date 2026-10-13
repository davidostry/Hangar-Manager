export type MaintenanceStatus =
  | "Open"
  | "InProgress"
  | "Resolved"
  | "Cancelled";

export type MaintenancePriority =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export interface MaintenanceReport {
  id: string;
  aircraft_id: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reported_at: string;
  reported_by: string;
  assigned_to: string | null;
  completed_at: string | null;
  resolution_notes?: string | null;
  reported_by_name?: string | null;
  assigned_to_name?: string | null;
  aircraft_tail_number?: string | null;
}

export interface MaintenanceReportListParams {
  search?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  page?: number;
  page_size?: number;
}

export interface MaintenanceReportListResponse {
  items: MaintenanceReport[];
  total: number;
  page: number;
  page_size: number;
}