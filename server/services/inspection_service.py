
from datetime import date, datetime, timezone
from uuid import UUID

from dal.aircraft_dal import get_aircraft_by_id

from dal.inspection_dal import (
    get_all_inspections,
    get_inspection_by_id,
    create_inspection,
    update_inspection,
    delete_inspection,
)

from schemas.inspection_schema import (
    InspectionCreate,
    InspectionUpdate,
    InspectionComplete,
)

from services.aircraft_status_service import sync_aircraft_status


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def with_overdue(inspection: dict):
    due_date = date.fromisoformat(str(inspection["due_date"]))

    return {
        **inspection,
        "is_overdue": (
            inspection["status"] == "Scheduled"
            and due_date < datetime.now(timezone.utc).date()
        ),
    }


def get_all_inspections_service(aircraft_id: str | None = None):
    if aircraft_id:
        try:
            UUID(aircraft_id)
        except ValueError:
            raise ValueError("Invalid aircraft ID")

    return [
        with_overdue(item)
        for item in get_all_inspections(aircraft_id)
    ]


def get_inspection_by_id_service(inspection_id: str):
    try:
        UUID(inspection_id)
    except ValueError:
        raise ValueError("Invalid inspection ID")

    inspection = get_inspection_by_id(inspection_id)

    if not inspection:
        raise ValueError("Inspection not found")

    return with_overdue(inspection)


def create_inspection_service(data: InspectionCreate):
    aircraft_id = str(data.aircraft_id)

    if not get_aircraft_by_id(aircraft_id):
        raise ValueError("Aircraft not found")

    inspection_data = data.model_dump(mode="json")

    inspection_data["status"] = "Scheduled"
    inspection_data["created_at"] = now_iso()
    inspection_data["updated_at"] = now_iso()

    inspection = create_inspection(inspection_data)

    sync_aircraft_status(aircraft_id)

    return with_overdue(inspection)


def update_inspection_service(
    inspection_id: str,
    data: InspectionUpdate
):
    inspection = get_inspection_by_id_service(inspection_id)

    if inspection["status"] != "Scheduled":
        raise ValueError("Cannot update a closed inspection")

    updates = data.model_dump(
        exclude_none=True,
        mode="json"
    )

    if not updates:
        return with_overdue(inspection)

    updates["updated_at"] = now_iso()

    updated = update_inspection(inspection_id, updates)

    sync_aircraft_status(inspection["aircraft_id"])

    return with_overdue(updated)


def complete_inspection_service(
    inspection_id: str,
    data: InspectionComplete,
    user_id: str
):
    inspection = get_inspection_by_id_service(inspection_id)

    if inspection["status"] != "Scheduled":
        raise ValueError("Inspection is already closed")

    updated = update_inspection(inspection_id, {
        "status": "Completed",
        "completed_at": now_iso(),
        "completed_by": user_id,
        "notes": data.notes,
        "updated_at": now_iso(),
    })

    sync_aircraft_status(inspection["aircraft_id"])

    return with_overdue(updated)


def cancel_inspection_service(inspection_id: str):
    inspection = get_inspection_by_id_service(inspection_id)

    if inspection["status"] != "Scheduled":
        raise ValueError("Inspection is already closed")

    updated = update_inspection(inspection_id, {
        "status": "Cancelled",
        "updated_at": now_iso(),
    })

    sync_aircraft_status(inspection["aircraft_id"])

    return with_overdue(updated)


def delete_inspection_service(inspection_id: str):
    inspection = get_inspection_by_id_service(inspection_id)

    if inspection["status"] == "Scheduled":
        raise ValueError("Only closed inspections can be deleted")

    deleted = delete_inspection(inspection_id)

    sync_aircraft_status(inspection["aircraft_id"])

    return with_overdue(deleted)
