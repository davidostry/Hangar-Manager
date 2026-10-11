import api from "./api";
import type { MaintenanceReport } from "../types/maintenance";
import type { PaginatedResponse } from "../types/aircraft";

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

const USE_MOCK_DATA =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_MOCK_DATA === "true";

const MOCK_MAINTENANCE_REPORTS: MaintenanceReport[] = [
  {
    id: "8eaf9c2a-3d5a-4f81-9a90-000000000001",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000001",
    title: "Engine vibration detected",
    description:
      "Unusual vibration was reported during the last engine inspection.",
    priority: "High",
    status: "Open",
    reported_at: "2026-10-10T08:30:00Z",
    reported_by: "Mock Administrator",
    assigned_to: null,
    completed_at: null,
  },
  {
    id: "8eaf9c2a-3d5a-4f81-9a90-000000000002",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000002",
    title: "Hydraulic system leak",
    description:
      "A hydraulic fluid leak was identified near the landing gear.",
    priority: "Critical",
    status: "InProgress",
    reported_at: "2026-10-09T11:15:00Z",
    reported_by: "Mock Administrator",
    assigned_to: "Mock Technician",
    completed_at: null,
  },
  {
    id: "8eaf9c2a-3d5a-4f81-9a90-000000000003",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000003",
    title: "Cabin lighting malfunction",
    description:
      "Several cabin lights are not functioning correctly.",
    priority: "Low",
    status: "Open",
    reported_at: "2026-10-08T14:00:00Z",
    reported_by: "Mock Administrator",
    assigned_to: null,
    completed_at: null,
  },
  {
    id: "8eaf9c2a-3d5a-4f81-9a90-000000000004",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000004",
    title: "Landing gear inspection",
    description:
      "Inspection and adjustment of the landing gear assembly.",
    priority: "Medium",
    status: "Resolved",
    reported_at: "2026-10-06T09:00:00Z",
    reported_by: "Mock Administrator",
    assigned_to: "Mock Technician",
    completed_at: "2026-10-07T13:30:00Z",
  },
  {
    id: "8eaf9c2a-3d5a-4f81-9a90-000000000005",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000001",
    title: "Oil pressure warning",
    description:
      "Oil pressure warning was recorded and requires further investigation.",
    priority: "High",
    status: "Cancelled",
    reported_at: "2026-10-05T07:45:00Z",
    reported_by: "Mock Administrator",
    assigned_to: null,
    completed_at: null,
  },
];

export async function getMaintenanceReports(
  params: MaintenanceReportListParams = {},
): Promise<PaginatedResponse<MaintenanceReport>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    100,
    Math.max(1, params.page_size ?? 10),
  );

  if (USE_MOCK_DATA) {
    const search = params.search?.trim().toLowerCase() ?? "";

    const filteredReports = MOCK_MAINTENANCE_REPORTS
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
          !params.status || report.status === params.status;

        const matchesPriority =
          !params.priority ||
          report.priority === params.priority;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority
        );
      })
      .sort(
        (a, b) =>
          new Date(b.reported_at).getTime() -
          new Date(a.reported_at).getTime(),
      );

    const startIndex = (page - 1) * pageSize;

    return {
      items: filteredReports.slice(
        startIndex,
        startIndex + pageSize,
      ),
      total: filteredReports.length,
      page,
      page_size: pageSize,
    };
  }

  const response = await api.get<
    PaginatedResponse<MaintenanceReport>
  >("/maintenance-reports", {
    params: {
      page,
      page_size: pageSize,
      ...(params.search?.trim()
        ? { search: params.search.trim() }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority
        ? { priority: params.priority }
        : {}),
    },
  });

  return response.data;
}

export async function getMaintenanceReportById(
  reportId: string,
): Promise<MaintenanceReport> {
  if (USE_MOCK_DATA) {
    const report = MOCK_MAINTENANCE_REPORTS.find(
      (item) => item.id === reportId,
    );

    if (!report) {
      throw new Error("Maintenance report not found.");
    }

    return report;
  }

  const response = await api.get<MaintenanceReport>(
    `/maintenance-reports/${reportId}`,
  );

  return response.data;
}

export async function createMaintenanceReport(
  payload: MaintenanceReportCreateRequest,
): Promise<MaintenanceReport> {
  if (USE_MOCK_DATA) {
    const now = new Date().toISOString();

    const newReport: MaintenanceReport = {
      id: crypto.randomUUID(),
      aircraft_id: payload.aircraft_id,
      title: payload.title.trim(),
      description: payload.description.trim(),
      priority: payload.priority,
      status: "Open",
      reported_at: now,
      reported_by: "Mock Administrator",
      assigned_to: null,
      completed_at: null,
    };

    MOCK_MAINTENANCE_REPORTS.unshift(newReport);

    return newReport;
  }

  const response = await api.post<MaintenanceReport>(
    "/maintenance-reports",
    {
      aircraft_id: payload.aircraft_id,
      title: payload.title.trim(),
      description: payload.description.trim(),
      priority: payload.priority,
    },
  );

  return response.data;
}