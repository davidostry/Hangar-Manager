"""Inspections workflow, validation, overdue calculation and closing rules."""
from datetime import date, timedelta
from unittest.mock import Mock
from uuid import UUID

import pytest

from schemas.inspection_schema import InspectionComplete, InspectionCreate, InspectionUpdate
from services import inspection_service as svc

AIRCRAFT_ID = "f262823f-5247-4239-a3fd-f12ce306b1c5"
INSPECTION_ID = "097bc962-7798-485f-b44f-d38f4aa9cdee"
USER_ID = "5f8a65f8-96a9-4b98-9c18-f39bcacd6ce0"


def inspection(**changes):
    return {
        "id": INSPECTION_ID, "aircraft_id": AIRCRAFT_ID,
        "inspection_type": "100-hour", "status": "Scheduled",
        "due_date": date.today().isoformat(), **changes,
    }


@pytest.mark.parametrize("offset,status,overdue", [
    (-1, "Scheduled", True), (0, "Scheduled", False),
    (2, "Scheduled", False), (-1, "Completed", False),
    (-1, "Cancelled", False),
])
def test_is_overdue_calculation(offset, status, overdue):
    item = inspection(
        status=status,
        due_date=(date.today() + timedelta(days=offset)).isoformat(),
    )
    assert svc.with_overdue(item)["is_overdue"] is overdue


def test_invalid_inspection_id_rejected_before_dal(monkeypatch):
    read = Mock()
    monkeypatch.setattr(svc, "get_inspection_by_id", read)
    with pytest.raises(ValueError, match="Invalid inspection ID"):
        svc.get_inspection_by_id_service("not-a-uuid")
    read.assert_not_called()


def test_create_inspection_syncs_aircraft(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value={"id": AIRCRAFT_ID}))
    insert = Mock(side_effect=lambda payload: {"id": INSPECTION_ID, **payload})
    sync = Mock()
    monkeypatch.setattr(svc, "create_inspection", insert)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    result = svc.create_inspection_service(InspectionCreate(
        aircraft_id=UUID(AIRCRAFT_ID), inspection_type="100-hour",
        due_date=date.today() + timedelta(days=1),
    ))
    assert result["status"] == "Scheduled"
    assert result["is_overdue"] is False
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_closed_inspection_cannot_be_updated(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection(
        status="Completed",
    )))
    update = Mock()
    monkeypatch.setattr(svc, "update_inspection", update)
    with pytest.raises(ValueError, match="closed inspection"):
        svc.update_inspection_service(INSPECTION_ID, InspectionUpdate(
            inspection_type="200-hour",
        ))
    update.assert_not_called()


def test_complete_inspection_records_completed_by(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection()))
    update = Mock(side_effect=lambda _id, values: inspection(**values))
    sync = Mock()
    monkeypatch.setattr(svc, "update_inspection", update)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    result = svc.complete_inspection_service(
        INSPECTION_ID, InspectionComplete(notes="Checked"), USER_ID,
    )
    assert result["status"] == "Completed"
    assert result["completed_by"] == USER_ID
    assert result["is_overdue"] is False
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_inspection_cannot_be_completed_twice(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection(
        status="Completed",
    )))
    update = Mock()
    monkeypatch.setattr(svc, "update_inspection", update)
    with pytest.raises(ValueError, match="already closed"):
        svc.complete_inspection_service(
            INSPECTION_ID, InspectionComplete(notes="Again"), USER_ID,
        )
    update.assert_not_called()


def test_scheduled_inspection_cannot_be_deleted(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection()))
    delete = Mock()
    monkeypatch.setattr(svc, "delete_inspection", delete)
    with pytest.raises(ValueError, match="Only closed"):
        svc.delete_inspection_service(INSPECTION_ID)
    delete.assert_not_called()


def test_cancelled_inspection_can_be_deleted_and_syncs(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection(
        status="Cancelled",
    )))
    delete = Mock(return_value=inspection(status="Cancelled"))
    sync = Mock()
    monkeypatch.setattr(svc, "delete_inspection", delete)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    assert svc.delete_inspection_service(INSPECTION_ID)["status"] == "Cancelled"
    delete.assert_called_once_with(INSPECTION_ID)
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_invalid_aircraft_filter_rejected(monkeypatch):
    read = Mock()
    monkeypatch.setattr(svc, "get_all_inspections", read)
    with pytest.raises(ValueError, match="Invalid aircraft ID"):
        svc.get_all_inspections_service("not-a-uuid")
    read.assert_not_called()


def test_get_all_marks_only_scheduled_past_inspections_overdue(monkeypatch):
    read = Mock(return_value=[
        inspection(due_date=(date.today()-timedelta(days=1)).isoformat()),
        inspection(status="Completed", due_date=(date.today()-timedelta(days=2)).isoformat()),
    ])
    monkeypatch.setattr(svc, "get_all_inspections", read)
    result = svc.get_all_inspections_service(AIRCRAFT_ID)
    assert [x["is_overdue"] for x in result] == [True, False]
    read.assert_called_once_with(AIRCRAFT_ID)


def test_create_inspection_missing_aircraft_does_not_write(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=None))
    insert = Mock()
    monkeypatch.setattr(svc, "create_inspection", insert)
    with pytest.raises(ValueError, match="Aircraft not found"):
        svc.create_inspection_service(InspectionCreate(
            aircraft_id=UUID(AIRCRAFT_ID), inspection_type="100-hour",
            due_date=date.today(),
        ))
    insert.assert_not_called()


def test_update_scheduled_inspection_and_sync(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection()))
    update = Mock(side_effect=lambda _id, values: inspection(**values))
    sync = Mock()
    monkeypatch.setattr(svc, "update_inspection", update)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    result = svc.update_inspection_service(INSPECTION_ID, InspectionUpdate(
        inspection_type="200-hour",
    ))
    assert result["inspection_type"] == "200-hour"
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_cancel_scheduled_inspection_and_sync(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection()))
    update = Mock(side_effect=lambda _id, values: inspection(**values))
    sync = Mock()
    monkeypatch.setattr(svc, "update_inspection", update)
    monkeypatch.setattr(svc, "sync_aircraft_status", sync)
    result = svc.cancel_inspection_service(INSPECTION_ID)
    assert result["status"] == "Cancelled"
    assert result["is_overdue"] is False
    sync.assert_called_once_with(AIRCRAFT_ID)


def test_cannot_cancel_closed_inspection(monkeypatch):
    monkeypatch.setattr(svc, "get_inspection_by_id", Mock(return_value=inspection(
        status="Completed",
    )))
    update = Mock()
    monkeypatch.setattr(svc, "update_inspection", update)
    with pytest.raises(ValueError, match="already closed"):
        svc.cancel_inspection_service(INSPECTION_ID)
    update.assert_not_called()
