"""Aircraft status business rule priority, fully isolated from DAL."""
from datetime import date, timedelta
from unittest.mock import Mock

import pytest

from services import aircraft_status_service as svc


@pytest.mark.parametrize("reports, day_offset, expected_status", [
    ([], None, "Available"),
    ([{"priority": "High"}], None, "Maintenance"),
    ([{"priority": "Critical"}], None, "Grounded"),
    ([], -1, "Grounded"),
    ([], 0, "Inspection"),
    ([], 2, "Available"),
    ([{"priority": "High"}], 0, "Inspection"),
    ([{"priority": "Critical"}], 0, "Grounded"),
])
def test_status_based_on_maintenance_and_inspections(
    monkeypatch, reports, day_offset, expected_status,
):
    inspection_rows = [] if day_offset is None else [{
        "due_date": (date.today() + timedelta(days=day_offset)).isoformat()
    }]
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value={
        "id": "aircraft-1", "status": "Available",
    }))
    monkeypatch.setattr(svc, "get_active_reports_by_aircraft", Mock(return_value=reports))
    monkeypatch.setattr(svc, "get_scheduled_inspections_by_aircraft", Mock(
        return_value=inspection_rows,
    ))
    update = Mock(return_value={"id": "aircraft-1", "status": expected_status})
    monkeypatch.setattr(svc, "update_aircraft", update)
    result = svc.sync_aircraft_status("aircraft-1")
    assert result["status"] == expected_status
    if expected_status == "Available":
        update.assert_not_called()
    else:
        assert update.call_args.args == ("aircraft-1", update.call_args.args[1])
        assert update.call_args.args[1]["status"] == expected_status


def test_no_write_if_status_is_unchanged(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value={
        "id": "aircraft-1", "status": "Maintenance",
    }))
    monkeypatch.setattr(svc, "get_active_reports_by_aircraft", Mock(return_value=[
        {"priority": "Low"},
    ]))
    monkeypatch.setattr(svc, "get_scheduled_inspections_by_aircraft", Mock(return_value=[]))
    update = Mock()
    monkeypatch.setattr(svc, "update_aircraft", update)
    assert svc.sync_aircraft_status("aircraft-1")["status"] == "Maintenance"
    update.assert_not_called()


def test_unknown_aircraft_fails(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=None))
    with pytest.raises(ValueError, match="Aircraft not found"):
        svc.sync_aircraft_status("missing")
