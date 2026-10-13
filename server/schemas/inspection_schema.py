from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class InspectionStatus(str, Enum):
    SCHEDULED = "Scheduled"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class InspectionCreate(BaseModel):
    aircraft_id: UUID
    inspection_type: str = Field(min_length=1)
    due_date: date
    notes: str | None = None


class InspectionUpdate(BaseModel):
    inspection_type: str | None = Field(default=None, min_length=1)
    due_date: date | None = None
    notes: str | None = None


class InspectionComplete(BaseModel):
    notes: str = Field(min_length=1)


class InspectionResponse(BaseModel):
    id: UUID
    aircraft_id: UUID
    inspection_type: str
    due_date: date
    status: InspectionStatus
    completed_at: datetime | None = None
    completed_by: UUID | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    is_overdue: bool
    aircraft_tail_number: str | None = None