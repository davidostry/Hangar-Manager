
import api from "./api";

import type {
  Inspection,
  InspectionCreateRequest,
  InspectionListParams,
  InspectionListResponse,
  InspectionStatus,
} from "../types/inspection";

// ========================================
// GET ALL INSPECTIONS
// ========================================

export async function getInspections(
  params: InspectionListParams = {},
): Promise<InspectionListResponse> {

  // Pagination settings
  const page = Math.max(1, params.page ?? 1);

  const pageSize = Math.min(
    100,
    Math.max(1, params.page_size ?? 10),
  );

  // Backend returns an array directly
  const response = await api.get<Inspection[]>(
    "/inspections",
  );

  // Validate API response
  if (!Array.isArray(response.data)) {
    throw new Error(
      "Invalid inspections response: expected an array",
    );
  }

  let filteredInspections = response.data;

  // Filter by aircraft ID
  if (params.aircraft_id) {
    filteredInspections = filteredInspections.filter(
      (inspection) =>
        inspection.aircraft_id === params.aircraft_id,
    );
  }

  // Filter by status
  if (params.status) {
    filteredInspections = filteredInspections.filter(
      (inspection) =>
        inspection.status === params.status,
    );
  }

  // Filter inspections due before a date
  if (params.due_before) {
    const dueBefore = params.due_before;

    filteredInspections = filteredInspections.filter(
      (inspection) =>
        inspection.due_date.slice(0, 10) <= dueBefore,
    );
  }

  // Filter inspections due after a date
  if (params.due_after) {
    const dueAfter = params.due_after;

    filteredInspections = filteredInspections.filter(
      (inspection) =>
        inspection.due_date.slice(0, 10) >= dueAfter,
    );
  }

  // Filter overdue inspections
  if (params.overdue === true) {
    const now = new Date();

    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    filteredInspections = filteredInspections.filter(
      (inspection) =>
        inspection.status === "Scheduled" &&
        inspection.due_date.slice(0, 10) < today,
    );
  }

  // Pagination
  const startIndex = (page - 1) * pageSize;

  const paginatedInspections = filteredInspections.slice(
    startIndex,
    startIndex + pageSize,
  );

  // Return the format expected by the Frontend
  return {
    items: paginatedInspections,
    total: filteredInspections.length,
    page,
    page_size: pageSize,
  };
}

// ========================================
// CREATE INSPECTION
// ========================================

export async function createInspection(
  payload: InspectionCreateRequest,
): Promise<Inspection> {

  // Normalize the data before sending
  const normalizedPayload: InspectionCreateRequest = {
    aircraft_id: payload.aircraft_id,
    inspection_type: payload.inspection_type.trim(),
    due_date: payload.due_date,
    notes: payload.notes?.trim() || null,
  };

  // Send request to Backend
  const response = await api.post<Inspection>(
    "/inspections",
    normalizedPayload,
  );

  return response.data;
}

// ========================================
// UPDATE INSPECTION STATUS
// ========================================

export async function updateInspectionStatus(
  inspectionId: string,
  status: InspectionStatus,
): Promise<Inspection> {

  const encodedId = encodeURIComponent(inspectionId);

  // Complete inspection
  if (status === "Completed") {
    const response = await api.patch<Inspection>(
      `/inspections/${encodedId}/complete`,
    );

    return response.data;
  }

  // Cancel inspection
  if (status === "Cancelled") {
    const response = await api.patch<Inspection>(
      `/inspections/${encodedId}/cancel`,
    );

    return response.data;
  }

  // Other transitions are not supported here
  throw new Error(
    `Unsupported inspection status transition: ${status}`,
  );
}
