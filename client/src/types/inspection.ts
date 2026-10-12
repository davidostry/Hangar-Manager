export type InspectionStatus =
  | "Scheduled"
  | "Completed"
  | "Cancelled";

export interface Inspection {
  id: string;
  aircraft_id: string;
  inspection_type: string;
  due_date: string;
  status: InspectionStatus;
  completed_at: string | null;
  notes: string | null;
}

export interface InspectionListParams {
  aircraft_id?: string;
  status?: InspectionStatus;
  due_before?: string;
  due_after?: string;
  overdue?: boolean;
  page?: number;
  page_size?: number;
}

export interface InspectionListResponse {
  items: Inspection[];
  total: number;
  page: number;
  page_size: number;
}