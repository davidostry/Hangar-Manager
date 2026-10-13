"""Aircraft CRUD service rules without any real database access."""
from unittest.mock import Mock

import pytest
from pydantic import ValidationError

from schemas.aircraft_schema import AircraftCreate, AircraftUpdate
from services import aircraft_service as svc

AIRCRAFT = {
    "id": "aircraft-1", "tail_number": "202", "status": "Available",
    "manufacturer": "Boeing", "model": "737", "serial_number": "SN123",
    "manufacture_year": 2020,
}


def create_data(**overrides):
    return AircraftCreate(**({
        "tail_number": "202", "manufacturer": "Boeing", "model": "737",
        "serial_number": "SN123", "manufacture_year": 2020,
    } | overrides))


def test_create_aircraft_defaults_to_available(monkeypatch):
    insert = Mock(side_effect=lambda payload: {"id": "aircraft-1", **payload})
    monkeypatch.setattr(svc, "create_aircraft", insert)
    result = svc.create_aircraft_service(create_data())
    assert result["status"] == "Available"
    assert insert.call_args.args[0]["tail_number"] == "202"


def test_get_missing_aircraft(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=None))
    with pytest.raises(ValueError, match="Aircraft not found"):
        svc.get_aircraft_by_id_service("unknown")


def test_update_only_requested_fields(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=AIRCRAFT))
    update = Mock(return_value={**AIRCRAFT, "model": "737 MAX"})
    monkeypatch.setattr(svc, "update_aircraft", update)
    result = svc.update_aircraft_service("aircraft-1", AircraftUpdate(model="737 MAX"))
    assert result["model"] == "737 MAX"
    assert update.call_args.args[1]["model"] == "737 MAX"
    assert "manufacturer" not in update.call_args.args[1]
    assert "updated_at" in update.call_args.args[1]


def test_empty_update_avoids_database_write(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=AIRCRAFT))
    update = Mock()
    monkeypatch.setattr(svc, "update_aircraft", update)
    assert svc.update_aircraft_service("aircraft-1", AircraftUpdate()) == AIRCRAFT
    update.assert_not_called()


def test_delete_missing_aircraft(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=None))
    delete = Mock()
    monkeypatch.setattr(svc, "delete_aircraft", delete)
    with pytest.raises(ValueError, match="Aircraft not found"):
        svc.delete_aircraft_service("unknown")
    delete.assert_not_called()


def test_delete_existing_aircraft(monkeypatch):
    monkeypatch.setattr(svc, "get_aircraft_by_id", Mock(return_value=AIRCRAFT))
    delete = Mock(return_value=AIRCRAFT)
    monkeypatch.setattr(svc, "delete_aircraft", delete)
    assert svc.delete_aircraft_service("aircraft-1") == AIRCRAFT
    delete.assert_called_once_with("aircraft-1")


def test_aircraft_year_earlier_than_1903_is_invalid():
    with pytest.raises(ValidationError):
        create_data(manufacture_year=1800)


def test_aircraft_empty_tail_number_is_invalid():
    with pytest.raises(ValidationError):
        create_data(tail_number="")


class _DatabaseError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__("mock database failure")


def test_create_duplicate_aircraft_returns_409(monkeypatch):
    from fastapi import HTTPException
    from controllers import aircraft_controller as ctrl

    monkeypatch.setattr(ctrl, "create_aircraft_service", Mock(side_effect=_DatabaseError("23505")))
    with pytest.raises(HTTPException) as raised:
        ctrl.create_aircraft_controller(create_data())
    assert raised.value.status_code == 409
    assert "serial number" in raised.value.detail


def test_delete_aircraft_with_related_records_returns_409(monkeypatch):
    from fastapi import HTTPException
    from controllers import aircraft_controller as ctrl

    monkeypatch.setattr(ctrl, "delete_aircraft_service", Mock(side_effect=_DatabaseError("23503")))
    with pytest.raises(HTTPException) as raised:
        ctrl.delete_aircraft_controller("aircraft-1")
    assert raised.value.status_code == 409


def test_unexpected_aircraft_error_does_not_get_masked(monkeypatch):
    from controllers import aircraft_controller as ctrl

    monkeypatch.setattr(ctrl, "create_aircraft_service", Mock(side_effect=RuntimeError("Unexpected failure")))
    with pytest.raises(RuntimeError, match="Unexpected failure"):
        ctrl.create_aircraft_controller(create_data())
