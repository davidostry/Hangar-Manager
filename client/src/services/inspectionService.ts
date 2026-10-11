
import api from "./api";

import type {
  Inspection,
  InspectionCreateRequest,
  InspectionListParams,
  InspectionListResponse,
  InspectionStatus,
} from "../types/inspection";

const USE_MOCK_DATA =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_MOCK_DATA === "true";

const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: "9b200001-1111-4111-8111-111111111111",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000001",
    inspection_type: "Annual inspection",
    due_date: "2026-10-05",
    status: "Scheduled",
    completed_at: null,
    notes: "Review the annual inspection checklist.",
  },
  {
    id: "9b200002-2222-4222-8222-222222222222",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000002",
    inspection_type: "Hydraulic system inspection",
    due_date: "2026-10-14",
    status: "Scheduled",
    completed_at: null,
    notes: "Inspect hydraulic pressure and connections.",
  },
  {
    id: "9b200003-3333-4333-8333-333333333333",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000003",
    inspection_type: "Landing gear inspection",
    due_date: "2026-09-30",
    status: "Completed",
    completed_at: "2026-09-29T12:30:00Z",
    notes: "Inspection completed and recorded.",
  },
  {
    id: "9b200004-4444-4444-8444-444444444444",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000004",
    inspection_type: "Safety inspection",
    due_date: "2026-10-08",
    status: "Scheduled",
    completed_at: null,
    notes: "Review open safety items before release.",
  },
  {
    id: "9b200005-5555-4555-8555-555555555555",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000001",
    inspection_type: "Avionics inspection",
    due_date: "2026-11-01",
    status: "Scheduled",
    completed_at: null,
    notes: null,
  },
  {
    id: "9b200006-6666-4666-8666-666666666666",
    aircraft_id: "7eaf9c2a-3d5a-4f81-9a90-000000000002",
    inspection_type: "Pre-flight inspection",
    due_date: "2026-10-02",
    status: "Cancelled",
    completed_at: null,
    notes: "Cancelled in the demo data.",
  },
];

/*
 * Mock fixtures for testing the overdue filter.
 * Production overdue calculations belong to the Backend.
 */
const MOCK_OVERDUE_IDS = new Set([
  "9b200001-1111-4111-8111-111111111111",
  "9b200004-4444-4444-8444-444444444444",
]);

export async function getInspections(
  params: InspectionListParams = {},
): Promise<InspectionListResponse> {
  const page = Math.max(1, params.page ?? 1);

  const pageSize = Math.min(
    100,
    Math.max(1, params.page_size ?? 10),
  );

  if (USE_MOCK_DATA) {
    let filteredInspections = [...MOCK_INSPECTIONS];

    if (params.aircraft_id) {
      filteredInspections = filteredInspections.filter(
        (inspection) =>
          inspection.aircraft_id === params.aircraft_id,
      );
    }

    if (params.status) {
      filteredInspections = filteredInspections.filter(
        (inspection) =>
          inspection.status === params.status,
      );
    }

    if (params.due_before) {
      filteredInspections = filteredInspections.filter(
        (inspection) =>
          inspection.due_date <= params.due_before!,
      );
    }

    if (params.due_after) {
      filteredInspections = filteredInspections.filter(
        (inspection) =>
          inspection.due_date >= params.due_after!,
      );
    }

    if (params.overdue === true) {
      filteredInspections = filteredInspections.filter(
        (inspection) =>
          inspection.status === "Scheduled" &&
          MOCK_OVERDUE_IDS.has(inspection.id),
      );
    }

    const startIndex = (page - 1) * pageSize;

    return {
      items: filteredInspections.slice(
        startIndex,
        startIndex + pageSize,
      ),
      total: filteredInspections.length,
      page,
      page_size: pageSize,
    };
  }

  const response = await api.get<InspectionListResponse>(
    "/inspections",
    {
      params: {
        page,
        page_size: pageSize,
        ...(params.aircraft_id
          ? { aircraft_id: params.aircraft_id }
          : {}),
        ...(params.status
          ? { status: params.status }
          : {}),
        ...(params.due_before
          ? { due_before: params.due_before }
          : {}),
        ...(params.due_after
          ? { due_after: params.due_after }
          : {}),
        ...(params.overdue === true
          ? { overdue: true }
          : {}),
      },
    },
  );

  return response.data;
}

export async function createInspection(
  payload: InspectionCreateRequest,
): Promise<Inspection> {
  const normalizedPayload: InspectionCreateRequest = {
    aircraft_id: payload.aircraft_id,
    inspection_type: payload.inspection_type.trim(),
    due_date: payload.due_date,
    notes: payload.notes?.trim() || null,
  };

  if (USE_MOCK_DATA) {
    const newInspection: Inspection = {
      id: crypto.randomUUID(),
      aircraft_id: normalizedPayload.aircraft_id,
      inspection_type: normalizedPayload.inspection_type,
      due_date: normalizedPayload.due_date,
      status: "Scheduled",
      completed_at: null,
      notes: normalizedPayload.notes ?? null,
    };

    MOCK_INSPECTIONS.unshift(newInspection);

    return { ...newInspection };
  }

  const response = await api.post<Inspection>(
    "/inspections",
    normalizedPayload,
  );

  return response.data;
}

export async function updateInspectionStatus(
  inspectionId: string,
  status: InspectionStatus,
): Promise<Inspection> {
  if (USE_MOCK_DATA) {
    const inspection = MOCK_INSPECTIONS.find(
      (item) => item.id === inspectionId,
    );

    if (!inspection) {
      throw new Error("Inspection not found.");
    }

    inspection.status = status;
    inspection.completed_at =
      status === "Completed" ? new Date().toISOString() : null;

    return { ...inspection };
  }

  const response = await api.patch<Inspection>(
    `/inspections/${inspectionId}`,
    { status },
  );

  return response.data;
}
