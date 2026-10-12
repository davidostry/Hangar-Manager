from datetime import date, datetime, timedelta, timezone

from dal.dashboard_dal import get_dashboard_data


def get_dashboard_summary_service():
    data = get_dashboard_data()

    aircraft = data["aircraft"]
    reports = data["reports"]
    inspections = data["inspections"]

    # Aircraft statistics

    aircraft_by_status = {
        "Available": 0,
        "Maintenance": 0,
        "Inspection": 0,
        "Grounded": 0,
    }

    for item in aircraft:
        status = item["status"]

        if status in aircraft_by_status:
            aircraft_by_status[status] += 1

    # Maintenance statistics

    maintenance_by_status = {
        "Open": 0,
        "InProgress": 0,
        "Resolved": 0,
        "Cancelled": 0,
    }

    for report in reports:
        status = report["status"]

        if status in maintenance_by_status:
            maintenance_by_status[status] += 1

    active_reports = [
        report for report in reports
        if report["status"] in ["Open", "InProgress"]
    ]

    critical_active = sum(
        1 for report in active_reports
        if report["priority"] == "Critical"
    )

    # Inspection statistics

    today = datetime.now(timezone.utc).date()
    end_date = today + timedelta(days=30)

    scheduled = [
        item for item in inspections
        if item["status"] == "Scheduled"
    ]

    overdue = 0
    upcoming_30_days = 0

    for item in scheduled:
        due_date = date.fromisoformat(
            str(item["due_date"])
        )

        if due_date < today:
            overdue += 1

        elif due_date <= end_date:
            upcoming_30_days += 1

    # Dashboard response

    return {
        "aircraft": {
            "total": len(aircraft),
            "by_status": aircraft_by_status,
        },
        "maintenance": {
            "total": len(reports),
            "active": len(active_reports),
            "critical_active": critical_active,
            "by_status": maintenance_by_status,
        },
        "inspections": {
            "total": len(inspections),
            "scheduled": len(scheduled),
            "completed": sum(
                1 for item in inspections
                if item["status"] == "Completed"
            ),
            "cancelled": sum(
                1 for item in inspections
                if item["status"] == "Cancelled"
            ),
            "overdue": overdue,
            "upcoming_30_days": upcoming_30_days,
        },
    }
