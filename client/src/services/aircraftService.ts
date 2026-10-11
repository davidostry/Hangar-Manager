import api from "./api";

import type {
  Aircraft,
  AircraftCreateRequest,
  AircraftListParams,
  AircraftUpdateRequest,
  PaginatedResponse,
} from "../types/aircraft";

const USE_MOCK_DATA =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_MOCK_DATA === "true";

let mockAircraftRecords: Aircraft[] = [
  {
    id: "7eaf9c2a-3d5a-4f81-9a90-000000000001",
    tail_number: "4X-ABC",
    manufacturer: "Airbus",
    model: "A320",
    serial_number: "A320-1001",
    manufacture_year: 2020,
    status: "Available",
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
  },
  {
    id: "7eaf9c2a-3d5a-4f81-9a90-000000000002",
    tail_number: "4X-DEF",
    manufacturer: "Boeing",
    model: "737-800",
    serial_number: "B737-2002",
    manufacture_year: 2018,
    status: "Maintenance",
    created_at: "2026-02-12T08:00:00Z",
    updated_at: "2026-10-01T10:30:00Z",
  },
  {
    id: "7eaf9c2a-3d5a-4f81-9a90-000000000003",
    tail_number: "4X-GHI",
    manufacturer: "Cessna",
    model: "Citation XLS",
    serial_number: "CIT-3003",
    manufacture_year: 2022,
    status: "Inspection",
    created_at: "2026-03-05T09:00:00Z",
    updated_at: "2026-10-05T14:00:00Z",
  },
  {
    id: "7eaf9c2a-3d5a-4f81-9a90-000000000004",
    tail_number: "4X-JKL",
    manufacturer: "Embraer",
    model: "E190",
    serial_number: "EMB-4004",
    manufacture_year: 2016,
    status: "Grounded",
    created_at: "2026-04-20T07:30:00Z",
    updated_at: "2026-10-08T16:00:00Z",
  },
];

export async function getAircraftList(
  params: AircraftListParams = {},
): Promise<PaginatedResponse<Aircraft>> {
  const page = Math.max(1, params.page ?? 1);

  const pageSize = Math.min(
    100,
    Math.max(1, params.page_size ?? 20),
  );

  if (USE_MOCK_DATA) {
    const search = params.search?.trim().toLowerCase() ?? "";

    const filteredAircraft = mockAircraftRecords.filter(
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

    const startIndex = (page - 1) * pageSize;

    return {
      items: filteredAircraft.slice(
        startIndex,
        startIndex + pageSize,
      ),
      total: filteredAircraft.length,
      page,
      page_size: pageSize,
    };
  }

  const response = await api.get<PaginatedResponse<Aircraft>>(
    "/aircraft",
    {
      params: {
        page,
        page_size: pageSize,
        ...(params.search
          ? { search: params.search }
          : {}),
        ...(params.status
          ? { status: params.status }
          : {}),
      },
    },
  );

  return response.data;
}

export async function getAircraftById(
  aircraftId: string,
): Promise<Aircraft | null> {
  if (USE_MOCK_DATA) {
    return (
      mockAircraftRecords.find(
        (aircraft) => aircraft.id === aircraftId,
      ) ?? null
    );
  }

  const response = await api.get<Aircraft>(
    `/aircraft/${encodeURIComponent(aircraftId)}`,
  );

  return response.data;
}

export async function createAircraft(
  payload: AircraftCreateRequest,
): Promise<Aircraft> {
  if (USE_MOCK_DATA) {
    const now = new Date().toISOString();

    const aircraft: Aircraft = {
      ...payload,
      id: crypto.randomUUID(),
      status: "Available",
      created_at: now,
      updated_at: now,
    };

    mockAircraftRecords = [
      aircraft,
      ...mockAircraftRecords,
    ];

    return aircraft;
  }

  const response = await api.post<Aircraft>(
    "/aircraft",
    payload,
  );

  return response.data;
}

export async function updateAircraft(
  aircraftId: string,
  payload: AircraftUpdateRequest,
): Promise<Aircraft> {
  if (USE_MOCK_DATA) {
    const index = mockAircraftRecords.findIndex(
      (aircraft) => aircraft.id === aircraftId,
    );

    if (index === -1) {
      throw new Error("Aircraft not found.");
    }

    const currentAircraft = mockAircraftRecords[index];

    if (!currentAircraft) {
      throw new Error("Aircraft not found.");
    }

    const updatedAircraft: Aircraft = {
      ...currentAircraft,
      ...payload,
      id: currentAircraft.id,
      status: currentAircraft.status,
      created_at: currentAircraft.created_at,
      updated_at: new Date().toISOString(),
    };

    mockAircraftRecords = mockAircraftRecords.map(
      (aircraft) =>
        aircraft.id === aircraftId
          ? updatedAircraft
          : aircraft,
    );

    return updatedAircraft;
  }

  const response = await api.patch<Aircraft>(
    `/aircraft/${encodeURIComponent(aircraftId)}`,
    payload,
  );

  return response.data;
}