from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class MaintenanceStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "InProgress"
    RESOLVED = "Resolved"
    CANCELLED = "Cancelled"


class MaintenancePriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class MaintenanceCreate(BaseModel):
    aircraft_id: UUID
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: MaintenancePriority = MaintenancePriority.MEDIUM


class MaintenanceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    priority: MaintenancePriority | None = None


class MaintenanceAssign(BaseModel):
    assigned_to: UUID


class MaintenanceResolve(BaseModel):
    resolution_notes: str = Field(min_length=1)


class MaintenanceResponse(BaseModel):
    id: UUID
    aircraft_id: UUID
    title: str
    description: str
    priority: MaintenancePriority
    status: MaintenanceStatus
    reported_by: UUID
    assigned_to: UUID | None = None
    reported_at: datetime
    completed_at: datetime | None = None
    resolution_notes: str | None = None
    reported_by_name: str | None = None
    assigned_to_name: str | None = None
    aircraft_tail_number: str | None = None
