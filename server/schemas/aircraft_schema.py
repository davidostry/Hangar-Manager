from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class AircraftStatus(str, Enum):
    AVAILABLE = "Available"
    MAINTENANCE = "Maintenance"
    INSPECTION = "Inspection"
    GROUNDED = "Grounded"


class AircraftCreate(BaseModel):
    tail_number: str = Field(min_length=1)
    manufacturer: str = Field(min_length=1)
    model: str = Field(min_length=1)
    serial_number: str = Field(min_length=1)
    manufacture_year: int = Field(ge=1903)


class AircraftUpdate(BaseModel):
    tail_number: str | None = Field(default=None, min_length=1)
    manufacturer: str | None = Field(default=None, min_length=1)
    model: str | None = Field(default=None, min_length=1)
    serial_number: str | None = Field(default=None, min_length=1)
    manufacture_year: int | None = Field(default=None, ge=1903)


class AircraftResponse(BaseModel):
    id: UUID
    tail_number: str
    manufacturer: str
    model: str
    serial_number: str
    manufacture_year: int
    status: AircraftStatus
    created_at: datetime
    updated_at: datetime