"""Maintenance business workflows: creation, assignment, resolution, deletion."""
from unittest.mock import Mock
from uuid import UUID

import pytest

from schemas.maintenance_schema import (
    MaintenanceAssign, MaintenanceCreate, MaintenanceResolve, MaintenanceUpdate,
)
from services import maintenance_service as svc

AIRCRAFT_ID = "f262823f-5247-4239-a3fd-f12ce306b1c5"
USER_ID = "5f8a65f8-96a9-4b98-9c18-f39bcacd6ce0"
TECH_ID = "b1c939a1-ff08-4738-bd66-4b6c9002124a"


def report(**changes):
    return {
        "id": "report-1", "aircraft_id": AIRCRAFT_ID,
        "title": "Engine", "description": "Inspection finding",
        "status": "Open", "priority": "High", "assigned_to": None,
        **changes,
    }


def test_critical_creation_triggers_status_sync_and_email(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value={"id": AIRCRAFT_ID}))
    insert = Mock(side_effect=lambda data: {"id": "report-1", **data})
    monkeypatch.setattr(svc, "create_report", insert)
    sync = Mock()
    mail = Mock()
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    monkeypatch.setattr(svc, "send_critical_maintenance_email", mail)
    result = svc.create_report_service(MaintenanceCreate(
        aircraft_id=UUID(AIRCRAFT_ID), title="Engine", description="Hot engine",
        priority="Critical",
    ), USER_ID)
    assert result["status"] == "Open"
    assert result["reported_by"] == USER_ID
    sync.assert_called_once_with(AIRCRAFT_ID)
    mail.assert_called_once_with(result)
    assert insert.call_args.args[0]["priority"] == "Critical"


def test_noncritical_creation_does_not_send_email(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value={"id": AIRCRAFT_ID}))
    monkeypatch.setattr(svc, "create_report", Mock(side_effect=lambda data: {
        "id": "report-1", **data,
    }))
    monkeypatch.setattr(svc, "sync_aircraft_status", Mock())
    mail = Mock()
    monkeypatch.setattr(svc, "send_critical_maintenance_email", mail)
    svc.create_report_service(MaintenanceCreate(
        aircraft_id=UUID(AIRCRAFT_ID), title="Wheel", description="Low pressure",
    ), USER_ID)
    mail.assert_not_called()


def test_creation_missing_aircraft_does_not_insert(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=None))
    insert = Mock()
    monkeypatch.setattr(svc, "create_report", insert)
    with pytest.raises(ValueError, match="Aircraft not found"):
        svc.create_report_service(MaintenanceCreate(
            aircraft_id=UUID(AIRCRAFT_ID), title="Engine", description="Broken",
        ), USER_ID)
    insert.assert_not_called()


def test_critical_email_failure_does_not_undo_created_report(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value={"id": AIRCRAFT_ID}))
    monkeypatch.setattr(svc, "create_report", Mock(side_effect=lambda data: {
        "id": "report-1", **data,
    }))
    monkeypatch.setattr(svc, "sync_aircraft_status", Mock())
    monkeypatch.setattr(svc, "send_critical_maintenance_email", Mock(
        side_effect=RuntimeError("mail unavailable"),
    ))
    result = svc.create_report_service(MaintenanceCreate(
        aircraft_id=UUID(AIRCRAFT_ID), title="Engine", description="Failure",
        priority="Critical",
    ), USER_ID)
    assert result["id"] == "report-1"


@pytest.mark.parametrize("status", ["Resolved", "Cancelled"])
def test_closed_report_cannot_be_updated(monkeypatch, status):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report(status=status)))
    update = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    with pytest.raises(ValueError, match="closed report"):
        svc.update_report_service("report-1", MaintenanceUpdate(title="New"))
    update.assert_not_called()


def test_assign_report_changes_status(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report()))
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value={"role": "technician"}))
    update = Mock(return_value=report(status="InProgress", assigned_to=TECH_ID))
    sync = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    result = svc.assign_report_service("report-1", MaintenanceAssign(
        assigned_to=UUID(TECH_ID),
    ))
    assert result["assigned_to"] == TECH_ID
    update.assert_called_once_with("report-1", {
        "assigned_to": TECH_ID, "status": "InProgress",
    })
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_cannot_assign_report_to_missing_user(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report()))
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=None))
    update = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    with pytest.raises(ValueError, match="User not found"):
        svc.assign_report_service("report-1", MaintenanceAssign(assigned_to=UUID(TECH_ID)))
    update.assert_not_called()


def test_resolution_requires_assignee(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report()))
    update = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    with pytest.raises(ValueError, match="Assign a technician"):
        svc.resolve_report_service("report-1", MaintenanceResolve(resolution_notes="Fixed"))
    update.assert_not_called()


def test_resolve_critical_report_sends_resolved_alert(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report(
        status="InProgress", priority="Critical", assigned_to=TECH_ID,
    )))
    update = Mock(return_value=report(status="Resolved", priority="Critical", assigned_to=TECH_ID))
    sync = Mock()
    mail = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    monkeypatch.setattr(svc, "send_resolved_maintenance_email", mail)
    result = svc.resolve_report_service("report-1", MaintenanceResolve(resolution_notes="Fixed"))
    assert result["status"] == "Resolved"
    assert update.call_args.args[1]["status"] == "Resolved"
    assert update.call_args.args[1]["resolution_notes"] == "Fixed"
    sync.assert_called_once_with(AIRCRAFT_ID)
    mail.assert_called_once_with(result)


def test_open_report_cannot_be_deleted(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report()))
    delete = Mock()
    monkeypatch.setattr(svc, "delete_report", delete)
    with pytest.raises(ValueError, match="Only closed"):
        svc.delete_report_service("report-1")
    delete.assert_not_called()


@pytest.mark.parametrize("status", ["Resolved", "Cancelled"])
def test_closed_report_can_be_deleted(monkeypatch, status):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report(status=status)))
    delete = Mock(return_value={"id": "report-1"})
    monkeypatch.setattr(svc, "delete_report", delete)
    assert svc.delete_report_service("report-1")["id"] == "report-1"
    delete.assert_called_once_with("report-1")


def test_missing_report_raises_value_error(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=None))
    with pytest.raises(ValueError, match="Maintenance report not found"):
        svc.get_report_by_id_service("missing")


def test_open_report_can_update_title_and_sync(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report()))
    update = Mock(return_value=report(title="New title"))
    sync = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    result = svc.update_report_service("report-1", MaintenanceUpdate(title="New title"))
    assert result["title"] == "New title"
    assert update.call_args.args[1] == {"title": "New title"}
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_assign_closed_report_rejected_before_dal(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report(status="Resolved")))
    read = Mock()
    monkeypatch.setattr(svc, "get_user_by_id", read)
    with pytest.raises(ValueError, match="closed report"):
        svc.assign_report_service("report-1", MaintenanceAssign(assigned_to=UUID(TECH_ID)))
    read.assert_not_called()


def test_cannot_resolve_closed_report(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report(status="Cancelled")))
    update = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    with pytest.raises(ValueError, match="already closed"):
        svc.resolve_report_service("report-1", MaintenanceResolve(resolution_notes="Fixed"))
    update.assert_not_called()


def test_cancel_open_report_and_sync(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report()))
    update = Mock(return_value=report(status="Cancelled"))
    sync = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    result = svc.cancel_report_service("report-1")
    assert result["status"] == "Cancelled"
    update.assert_called_once_with("report-1", {"status": "Cancelled"})
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_cannot_cancel_already_closed_report(monkeypatch):
    monkeypatch.setattr(svc, "get_report_by_id", Mock(return_value=report(status="Resolved")))
    update = Mock()
    monkeypatch.setattr(svc, "update_report", update)
    with pytest.raises(ValueError, match="already closed"):
        svc.cancel_report_service("report-1")
    update.assert_not_called()
