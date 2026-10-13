"""FastAPI route contract tests with dependency overrides and mocked controllers.

No HTTP server is started, no JWT is transmitted, and no database/email is used.
"""
from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from dependencies.auth import get_current_user
from routes import auth_routes, email_routes, inspection_routes, maintenance_routes, user_routes

ADMIN = "5f8a65f8-96a9-4b98-9c18-f39bcacd6ce0"
AIRCRAFT = "f262823f-5247-4239-a3fd-f12ce306b1c5"
REPORT = "36eaa3fe-6a75-4b65-89e6-d4057bb0dc1a"
INSPECTION = "097bc962-7798-485f-b44f-d38f4aa9cdee"
TECH = "b1c939a1-ff08-4738-bd66-4b6c9002124a"


def client_for_role(role):
    app = FastAPI()
    for routes in (auth_routes, user_routes, maintenance_routes, inspection_routes, email_routes):
        app.include_router(routes.router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: {"id": ADMIN, "role": role}
    return TestClient(app)


def user(**updates):
    return {
        "id": TECH, "display_name": "Tech One", "email": "tech@example.com",
        "role": "technician", "is_active": True, **updates,
    }


def report(**updates):
    return {
        "id": REPORT, "aircraft_id": AIRCRAFT, "reported_by": ADMIN,
        "assigned_to": TECH, "title": "Engine", "description": "Critical failure",
        "priority": "Critical", "status": "InProgress",
        "reported_at": "2026-10-12T08:00:00Z", "reported_by_name": "Admin One",
        "assigned_to_name": "Tech One", "aircraft_tail_number": "202", **updates,
    }


def inspection(**updates):
    return {
        "id": INSPECTION, "aircraft_id": AIRCRAFT,
        "inspection_type": "100-hour", "due_date": "2026-10-15",
        "status": "Scheduled", "created_at": "2026-10-12T08:00:00Z",
        "updated_at": "2026-10-12T08:00:00Z", "is_overdue": False,
        "aircraft_tail_number": "202", **updates,
    }


def test_public_registration_endpoint_is_absent():
    response = client_for_role("admin").post("/api/v1/auth/register", json={})
    assert response.status_code == 404


@pytest.mark.parametrize("role,expected", [
    ("technician", 403), ("team_lead", 200),
    ("hangar_manager", 200), ("admin", 200),
])
def test_users_list_role_permissions_and_serialization(monkeypatch, role, expected):
    controller = Mock(return_value=[user()])
    monkeypatch.setattr(user_routes, "get_all_users_controller", controller)
    response = client_for_role(role).get("/api/v1/users")
    assert response.status_code == expected
    if expected == 200:
        assert response.json()[0]["display_name"] == "Tech One"
        assert response.json()[0]["is_active"] is True
        controller.assert_called_once_with(role)
    else:
        controller.assert_not_called()


@pytest.mark.parametrize("role,expected", [
    ("admin", 201), ("hangar_manager", 403),
    ("team_lead", 403), ("technician", 403),
])
def test_create_user_is_admin_only(monkeypatch, role, expected):
    controller = Mock(return_value=user())
    monkeypatch.setattr(user_routes, "create_user_controller", controller)
    response = client_for_role(role).post("/api/v1/users", json={
        "display_name": "Tech One", "email": "tech@example.com",
        "password": "LongPass123!", "role": "technician",
    })
    assert response.status_code == expected
    if expected == 201:
        assert response.json()["role"] == "technician"
        controller.assert_called_once()
    else:
        controller.assert_not_called()


@pytest.mark.parametrize("method", ["deactivate", "reactivate"])
def test_user_activation_route_passes_admin_id(monkeypatch, method):
    controller = Mock(return_value=user(is_active=(method == "reactivate")))
    monkeypatch.setattr(user_routes, "change_user_active_controller", controller)
    response = client_for_role("admin").patch(f"/api/v1/users/{TECH}/{method}")
    assert response.status_code == 200
    assert response.json()["is_active"] is (method == "reactivate")
    controller.assert_called_once_with(TECH, method == "reactivate", ADMIN)


@pytest.mark.parametrize("role", ["team_lead", "hangar_manager", "technician"])
def test_user_deactivation_restricted_to_admin(monkeypatch, role):
    controller = Mock()
    monkeypatch.setattr(user_routes, "change_user_active_controller", controller)
    response = client_for_role(role).patch(f"/api/v1/users/{TECH}/deactivate")
    assert response.status_code == 403
    controller.assert_not_called()


def test_maintenance_api_get_includes_enriched_fields(monkeypatch):
    monkeypatch.setattr(maintenance_routes, "get_all_reports_controller", Mock(return_value=[report()]))
    response = client_for_role("technician").get("/api/v1/maintenance/")
    assert response.status_code == 200
    assert response.json()[0]["reported_by_name"] == "Admin One"
    assert response.json()[0]["assigned_to_name"] == "Tech One"
    assert response.json()[0]["aircraft_tail_number"] == "202"
    assert response.json()[0]["aircraft_id"] == AIRCRAFT


def test_inspections_api_get_includes_tail_number(monkeypatch):
    monkeypatch.setattr(inspection_routes, "get_all_inspections_controller", Mock(return_value=[inspection()]))
    response = client_for_role("technician").get("/api/v1/inspections/")
    assert response.status_code == 200
    assert response.json()[0]["aircraft_tail_number"] == "202"


@pytest.mark.parametrize("role,expected", [
    ("technician", 403), ("team_lead", 403),
    ("hangar_manager", 200), ("admin", 200),
])
def test_inspection_cancel_role_protection(monkeypatch, role, expected):
    controller = Mock(return_value=inspection(status="Cancelled"))
    monkeypatch.setattr(inspection_routes, "cancel_inspection_controller", controller)
    response = client_for_role(role).patch(f"/api/v1/inspections/{INSPECTION}/cancel")
    assert response.status_code == expected
    if expected == 200:
        controller.assert_called_once_with(INSPECTION)
    else:
        controller.assert_not_called()


@pytest.mark.parametrize("role,expected", [
    ("technician", 403), ("team_lead", 403),
    ("hangar_manager", 403), ("admin", 200),
])
def test_test_email_is_admin_only_and_mocked(monkeypatch, role, expected):
    controller = Mock(return_value={"message": "Test email sent", "email_id": "fake-id"})
    monkeypatch.setattr(email_routes, "send_test_email_controller", controller)
    response = client_for_role(role).post("/api/v1/emails/test")
    assert response.status_code == expected
    if expected == 200:
        assert response.json()["email_id"] == "fake-id"
        controller.assert_called_once()
    else:
        controller.assert_not_called()
