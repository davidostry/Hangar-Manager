from pydantic import BaseModel


class AircraftDashboard(BaseModel):
    total: int
    by_status: dict[str, int]


class MaintenanceDashboard(BaseModel):
    total: int
    active: int
    critical_active: int
    by_status: dict[str, int]


class InspectionDashboard(BaseModel):
    total: int
    scheduled: int
    completed: int
    cancelled: int
    overdue: int
    upcoming_30_days: int


class DashboardResponse(BaseModel):
    aircraft: AircraftDashboard
    maintenance: MaintenanceDashboard
    inspections: InspectionDashboard
