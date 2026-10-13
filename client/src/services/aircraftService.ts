
import api from "./api";

import type {
  Aircraft,
  AircraftCreateRequest,
  AircraftListParams,
  AircraftUpdateRequest,
  PaginatedResponse,
} from "../types/aircraft";

// ========================================
// GET ALL AIRCRAFT
// ========================================

export async function getAircraftList(
  params: AircraftListParams = {},
): Promise<PaginatedResponse<Aircraft>> {

  // Set pagination values
  const page = Math.max(1, params.page ?? 1);

  const pageSize = Math.min(
    100,
    Math.max(1, params.page_size ?? 20),
  );

  // Fetch aircraft directly from the Backend
  const response = await api.get<Aircraft[]>(
    "/aircraft",
  );

  // Validate the Backend response
  if (!Array.isArray(response.data)) {
    throw new Error(
      "Invalid aircraft response: expected an array",
    );
  }

  // Prepare search text
  const search =
    params.search?.trim().toLowerCase() ?? "";

  // Filter aircraft by search text and status
  const filteredAircraft = response.data.filter(
    (aircraft) => {

      const matchesSearch =
        search.length === 0 ||
        [
          aircraft.tail_number,
          aircraft.manufacturer,
          aircraft.model,
          aircraft.serial_number,
        ].some((value) =>
          value.toLowerCase().includes(search),
        );

      const matchesStatus =
        !params.status ||
        aircraft.status === params.status;

      return matchesSearch && matchesStatus;
    },
  );

  // Calculate pagination
  const startIndex = (page - 1) * pageSize;

  const paginatedAircraft = filteredAircraft.slice(
    startIndex,
    startIndex + pageSize,
  );

  // Return the format expected by the Frontend
  return {
    items: paginatedAircraft,
    total: filteredAircraft.length,
    page,
    page_size: pageSize,
  };
}

// ========================================
// GET AIRCRAFT BY ID
// ========================================

export async function getAircraftById(
  aircraftId: string,
): Promise<Aircraft | null> {

  // Fetch a specific aircraft from the Backend
  const response = await api.get<Aircraft>(
    `/aircraft/${encodeURIComponent(aircraftId)}`,
  );

  return response.data;
}

// ========================================
// CREATE AIRCRAFT
// ========================================

export async function createAircraft(
  payload: AircraftCreateRequest,
): Promise<Aircraft> {

  // Send new aircraft data to the Backend
  const response = await api.post<Aircraft>(
    "/aircraft",
    payload,
  );

  return response.data;
}

// ========================================
// UPDATE AIRCRAFT
// ========================================

export async function updateAircraft(
  aircraftId: string,
  payload: AircraftUpdateRequest,
): Promise<Aircraft> {

  // Update aircraft information in the Backend
  const response = await api.patch<Aircraft>(
    `/aircraft/${encodeURIComponent(aircraftId)}`,
    payload,
  );

  return response.data;
}
