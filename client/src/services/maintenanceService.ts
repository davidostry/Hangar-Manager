import api from "./api";

import type {
  MaintenanceReport,
  MaintenanceReportListParams,
  MaintenanceReportListResponse,
} from "../types/maintenance";

const USE_MOCK_DATA =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_MOCK_DATA === "true";

const MOCK_REPORTS: MaintenanceReport[] = [
  {
    id: "8a100001-1111-4111-8111-111111111111",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000001",
    title: "Engine temperature warning",
    description:
      "An abnormal engine temperature warning was reported during operation.",
    priority: "Critical",
    status: "Open",
    reported_at: "2026-10-10T08:30:00Z",
    reported_by: "11111111-1111-4111-8111-111111111111",
    assigned_to: null,
    completed_at: null,
  },
  {
    id: "8a100002-2222-4222-8222-222222222222",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000002",
    title: "Hydraulic system inspection",
    description:
      "Hydraulic pressure requires inspection and additional testing.",
    priority: "High",
    status: "InProgress",
    reported_at: "2026-10-08T11:15:00Z",
    reported_by: "22222222-2222-4222-8222-222222222222",
    assigned_to: "22222222-2222-4222-8222-222222222222",
    completed_at: null,
  },
  {
    id: "8a100003-3333-4333-8333-333333333333",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000003",
    title: "Landing gear maintenance",
    description:
      "Landing gear maintenance and operational tests were completed.",
    priority: "Medium",
    status: "Resolved",
    reported_at: "2026-10-04T09:00:00Z",
    reported_by: "11111111-1111-4111-8111-111111111111",
    assigned_to: "22222222-2222-4222-8222-222222222222",
    completed_at: "2026-10-06T13:45:00Z",
  },
  {
    id: "8a100004-4444-4444-8444-444444444444",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000004",
    title: "Cabin lighting issue",
    description:
      "A cabin lighting issue was reported for further assessment.",
    priority: "Low",
    status: "Open",
    reported_at: "2026-10-03T14:20:00Z",
    reported_by: "11111111-1111-4111-8111-111111111111",
    assigned_to: null,
    completed_at: null,
  },
  {
    id: "8a100005-5555-4555-8555-555555555555",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000002",
    title: "Brake system noise",
    description:
      "An unusual noise was reported during a brake system check.",
    priority: "High",
    status: "Cancelled",
    reported_at: "2026-09-28T07:45:00Z",
    reported_by: "22222222-2222-4222-8222-222222222222",
    assigned_to: null,
    completed_at: null,
  },
];

export async function getMaintenanceReports(
  params: MaintenanceReportListParams = {},
): Promise<MaintenanceReportListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    100,
    Math.max(1, params.page_size ?? 10),
  );

  if (USE_MOCK_DATA) {
    const search = params.search?.trim().toLowerCase() ?? "";

    const filteredReports = MOCK_REPORTS.filter((report) => {
      const matchesSearch =
        search.length === 0 ||
        [
          report.title,
          report.description,
          report.aircraft_id,
          report.priority,
          report.status,
        ].some((value) => value.toLowerCase().includes(search));

      const matchesStatus =
        !params.status || report.status === params.status;

      const matchesPriority =
        !params.priority || report.priority === params.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });

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

  const response =
    await api.get<MaintenanceReportListResponse>(
      "/maintenance-reports",
      {
        params: {
          page,
          page_size: pageSize,
          ...(params.search ? { search: params.search } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.priority ? { priority: params.priority } : {}),
        },
      },
    );

  return response.data;
}

export async function getMaintenanceReportById(
  reportId: string,
): Promise<MaintenanceReport | null> {
  if (USE_MOCK_DATA) {
    return (
      MOCK_REPORTS.find((report) => report.id === reportId) ?? null
    );
  }

  const response = await api.get<MaintenanceReport>(
    `/maintenance-reports/${encodeURIComponent(reportId)}`,
  );

  return response.data;
}