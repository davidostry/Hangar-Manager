
import api from "./api";

import type { MaintenanceReport } from "../types/maintenance";
import type { PaginatedResponse } from "../types/aircraft";

// ========================================
// TYPES
// ========================================

export interface MaintenanceReportListParams {
  search?: string;
  status?: MaintenanceReport["status"];
  priority?: MaintenanceReport["priority"];
  page?: number;
  page_size?: number;
}

export interface MaintenanceReportCreateRequest {
  aircraft_id: string;
  title: string;
  description: string;
  priority: MaintenanceReport["priority"];
}

// ========================================
// GET ALL MAINTENANCE REPORTS
// ========================================

export async function getMaintenanceReports(
  params: MaintenanceReportListParams = {},
): Promise<PaginatedResponse<MaintenanceReport>> {

  // Pagination settings
  const page = Math.max(1, params.page ?? 1);

  const pageSize = Math.min(
    100,
    Math.max(1, params.page_size ?? 10),
  );

  // Get reports from the Backend
  const response = await api.get<MaintenanceReport[]>(
    "/maintenance",
  );

  // Validate the response
  if (!Array.isArray(response.data)) {
    throw new Error(
      "Invalid maintenance response: expected an array",
    );
  }

  // Prepare search value
  const search =
    params.search?.trim().toLowerCase() ?? "";

  // Search and filter reports
  const filteredReports = response.data
    .filter((report) => {

      const matchesSearch =
        search.length === 0 ||
        [
          report.title,
          report.description,
          report.aircraft_id,
        ].some((value) =>
          value.toLowerCase().includes(search),
        );

      const matchesStatus =
        !params.status ||
        report.status === params.status;

      const matchesPriority =
        !params.priority ||
        report.priority === params.priority;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    })

    // Sort newest reports first
    .sort(
      (a, b) =>
        new Date(b.reported_at).getTime() -
        new Date(a.reported_at).getTime(),
    );

  // Pagination
  const startIndex = (page - 1) * pageSize;

  const paginatedReports = filteredReports.slice(
    startIndex,
    startIndex + pageSize,
  );

  // Return the format expected by the Frontend
  return {
    items: paginatedReports,
    total: filteredReports.length,
    page,
    page_size: pageSize,
  };
}

// ========================================
// GET MAINTENANCE REPORT BY ID
// ========================================

export async function getMaintenanceReportById(
  reportId: string,
): Promise<MaintenanceReport> {

  const response = await api.get<MaintenanceReport>(
    `/maintenance/${encodeURIComponent(reportId)}`,
  );

  return response.data;
}

// ========================================
// CREATE MAINTENANCE REPORT
// ========================================

export async function createMaintenanceReport(
  payload: MaintenanceReportCreateRequest,
): Promise<MaintenanceReport> {

  // Normalize payload before sending
  const normalizedPayload: MaintenanceReportCreateRequest = {
    aircraft_id: payload.aircraft_id,
    title: payload.title.trim(),
    description: payload.description.trim(),
    priority: payload.priority,
  };

  // Send request to Backend
  const response = await api.post<MaintenanceReport>(
    "/maintenance",
    normalizedPayload,
  );

  return response.data;
}

// ========================================
// UPDATE MAINTENANCE REPORT STATUS
// ========================================

export async function updateMaintenanceReportStatus(
  reportId: string,
  status: MaintenanceReport["status"],
): Promise<MaintenanceReport> {

  const encodedId = encodeURIComponent(reportId);

  // Update status in the Backend
  await api.patch(
    `/maintenance/${encodedId}`,
    { status },
  );

  // Fetch updated report from the Backend
  return getMaintenanceReportById(reportId);
}
