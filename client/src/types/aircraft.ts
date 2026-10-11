export type AircraftStatus =
  | "Available"
  | "Maintenance"
  | "Inspection"
  | "Grounded";

export interface Aircraft {
  id: string;
  tail_number: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  manufacture_year: number;
  status: AircraftStatus;
  created_at: string;
  updated_at: string;
}

export interface AircraftListParams {
  search?: string;
  status?: AircraftStatus;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}