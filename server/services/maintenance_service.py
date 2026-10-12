
from datetime import datetime, timezone

from dal.maintenance_dal import (
    get_all_reports,
    get_report_by_id,
    create_report,
    update_report,
    delete_report,
    get_active_reports_by_aircraft,
)

from dal.aircraft_dal import (
    get_aircraft_by_id,
    update_aircraft,
)

from dal.user_dal import get_user_by_id

from schemas.maintenance_schema import (
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceAssign,
    MaintenanceResolve,
)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_all_reports_service(aircraft_id: str | None = None):
    return get_all_reports(aircraft_id)


def get_report_by_id_service(report_id: str):
    report = get_report_by_id(report_id)

    if not report:
        raise ValueError("Maintenance report not found")

    return report


def sync_aircraft_status(aircraft_id: str):
    aircraft = get_aircraft_by_id(aircraft_id)

    if not aircraft:
        raise ValueError("Aircraft not found")

    reports = get_active_reports_by_aircraft(aircraft_id)

    has_critical = any(
        report["priority"] == "Critical"
        for report in reports
    )

    current_status = aircraft["status"]

    if has_critical:
        new_status = "Grounded"

    elif current_status in ["Grounded", "Inspection"]:
        return aircraft

    elif reports:
        new_status = "Maintenance"

    else:
        new_status = "Available"

    if current_status == new_status:
        return aircraft

    return update_aircraft(aircraft_id, {
        "status": new_status,
        "updated_at": now_iso(),
    })


def create_report_service(
    data: MaintenanceCreate,
    user_id: str
):
    aircraft_id = str(data.aircraft_id)

    aircraft = get_aircraft_by_id(aircraft_id)

    if not aircraft:
        raise ValueError("Aircraft not found")

    report_data = data.model_dump(mode="json")

    report_data["reported_by"] = user_id
    report_data["status"] = "Open"
    report_data["reported_at"] = now_iso()

    report = create_report(report_data)

    sync_aircraft_status(aircraft_id)

    return report


def update_report_service(
    report_id: str,
    data: MaintenanceUpdate
):
    report = get_report_by_id_service(report_id)

    if report["status"] in ["Resolved", "Cancelled"]:
        raise ValueError("Cannot update a closed report")

    updates = data.model_dump(
        exclude_none=True,
        mode="json"
    )

    if not updates:
        return report

    updated_report = update_report(report_id, updates)

    sync_aircraft_status(report["aircraft_id"])

    return updated_report


def assign_report_service(
    report_id: str,
    data: MaintenanceAssign
):
    report = get_report_by_id_service(report_id)

    if report["status"] in ["Resolved", "Cancelled"]:
        raise ValueError("Cannot assign a closed report")

    user = get_user_by_id(str(data.assigned_to))

    if not user:
        raise ValueError("User not found")

    allowed_roles = [
        "technician",
        "team_lead",
        "hangar_manager",
        "admin",
    ]

    if user["role"] not in allowed_roles:
        raise ValueError("User cannot be assigned maintenance")

    updates = {
        "assigned_to": str(data.assigned_to),
        "status": "InProgress",
    }

    updated_report = update_report(report_id, updates)

    sync_aircraft_status(report["aircraft_id"])

    return updated_report


def resolve_report_service(
    report_id: str,
    data: MaintenanceResolve
):
    report = get_report_by_id_service(report_id)

    if report["status"] in ["Resolved", "Cancelled"]:
        raise ValueError("Report is already closed")

    if not report.get("assigned_to"):
        raise ValueError("Assign a technician before resolving")

    updates = {
        "status": "Resolved",
        "resolution_notes": data.resolution_notes,
        "completed_at": now_iso(),
    }

    updated_report = update_report(report_id, updates)

    sync_aircraft_status(report["aircraft_id"])

    return updated_report


def cancel_report_service(report_id: str):
    report = get_report_by_id_service(report_id)

    if report["status"] in ["Resolved", "Cancelled"]:
        raise ValueError("Report is already closed")

    updated_report = update_report(report_id, {
        "status": "Cancelled",
    })

    sync_aircraft_status(report["aircraft_id"])

    return updated_report


def delete_report_service(report_id: str):
    report = get_report_by_id_service(report_id)

    if report["status"] not in ["Resolved", "Cancelled"]:
        raise ValueError("Only closed reports can be deleted")

    return delete_report(report_id)
