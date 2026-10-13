import logging
from datetime import datetime, timezone

from dal.maintenance_dal import (
    get_all_reports,
    get_report_by_id,
    create_report,
    update_report,
    delete_report,
)

from dal.aircraft_dal import get_aircraft_by_id
from dal.user_dal import get_user_by_id

from services.aircraft_status_service import sync_aircraft_status

from services.email_service import (
    send_critical_maintenance_email,
    send_resolved_maintenance_email,
)

from schemas.maintenance_schema import (
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceAssign,
    MaintenanceResolve,
)


logger = logging.getLogger(__name__)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_all_reports_service(aircraft_id: str | None = None):
    return get_all_reports(aircraft_id)


def get_report_by_id_service(report_id: str):
    report = get_report_by_id(report_id)

    if not report:
        raise ValueError("Maintenance report not found")

    return report


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

    # Notify when critical maintenance is reported.
    if report["priority"] == "Critical":
        try:
            send_critical_maintenance_email(report)

        except (ValueError, RuntimeError) as error:
            logger.warning(
                "Critical report %s email failed: %s",
                report["id"],
                error
            )

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

    if not user.get("is_active", True):
        raise ValueError("Cannot assign maintenance to an inactive user")

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

    # Notify when critical maintenance is resolved.
    if updated_report["priority"] == "Critical":
        try:
            send_resolved_maintenance_email(updated_report)

        except (ValueError, RuntimeError) as error:
            logger.warning(
                "Resolved report %s email failed: %s",
                updated_report["id"],
                error
            )

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
