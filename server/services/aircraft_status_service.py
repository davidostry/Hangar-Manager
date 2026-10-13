
from datetime import date, datetime, timezone

from dal.aircraft_dal import get_aircraft_by_id, update_aircraft
from dal.maintenance_dal import get_active_reports_by_aircraft
from dal.inspection_dal import get_scheduled_inspections_by_aircraft


def sync_aircraft_status(aircraft_id: str):
    aircraft = get_aircraft_by_id(aircraft_id)

    if not aircraft:
        raise ValueError("Aircraft not found")

    reports = get_active_reports_by_aircraft(aircraft_id)
    inspections = get_scheduled_inspections_by_aircraft(aircraft_id)

    today = datetime.now(timezone.utc).date()

    has_critical = any(
        report["priority"] == "Critical"
        for report in reports
    )

    has_overdue = any(
        date.fromisoformat(str(item["due_date"])) < today
        for item in inspections
    )

    has_due_today = any(
        date.fromisoformat(str(item["due_date"])) == today
        for item in inspections
    )

    if has_critical or has_overdue:
        new_status = "Grounded"

    elif has_due_today:
        new_status = "Inspection"

    elif reports:
        new_status = "Maintenance"

    else:
        new_status = "Available"

    if aircraft["status"] == new_status:
        return aircraft

    return update_aircraft(aircraft_id, {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
