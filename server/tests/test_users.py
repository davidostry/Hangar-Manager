"""User business rules: authorization, inactive users and last-admin guard."""
from unittest.mock import Mock

import pytest

from schemas.user_schema import RoleUpdate, UserCreate
from services import user_service as svc


ADMIN = {
    "id": "admin-1", "email": "admin@example.com",
    "display_name": "Admin", "role": "admin", "is_active": True,
}
TECH = {
    "id": "tech-1", "email": "tech@example.com",
    "display_name": "Tech", "role": "technician", "is_active": True,
}


@pytest.mark.parametrize("role, expected_filter", [
    ("admin", None), ("hangar_manager", None), ("team_lead", "technician"),
])
def test_get_users_filters_by_role(monkeypatch, role, expected_filter):
    read = Mock(return_value=[TECH])
    monkeypatch.setattr(svc, "get_all_users", read)
    assert svc.get_all_users_service(role) == [TECH]
    if expected_filter is None:
        read.assert_called_once_with()
    else:
        read.assert_called_once_with(role=expected_filter)


def test_technician_cannot_get_users(monkeypatch):
    read = Mock()
    monkeypatch.setattr(svc, "get_all_users", read)
    with pytest.raises(PermissionError, match="Insufficient permissions"):
        svc.get_all_users_service("technician")
    read.assert_not_called()


def test_cannot_demote_last_active_admin(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=ADMIN))
    monkeypatch.setattr(svc, "count_active_admins", Mock(return_value=1))
    update = Mock()
    monkeypatch.setattr(svc, "update_user_role", update)
    with pytest.raises(PermissionError, match="last active admin"):
        svc.update_user_role_service("admin-1", RoleUpdate(role="team_lead"))
    update.assert_not_called()


def test_can_demote_admin_if_another_admin_exists(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=ADMIN))
    monkeypatch.setattr(svc, "count_active_admins", Mock(return_value=2))
    update = Mock(return_value={**ADMIN, "role": "team_lead"})
    monkeypatch.setattr(svc, "update_user_role", update)
    result = svc.update_user_role_service("admin-1", RoleUpdate(role="team_lead"))
    assert result["role"] == "team_lead"
    update.assert_called_once_with("admin-1", "team_lead")


def test_change_role_missing_user(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=None))
    with pytest.raises(ValueError, match="User not found"):
        svc.update_user_role_service("missing", RoleUpdate(role="admin"))


def test_cannot_deactivate_self(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=ADMIN))
    update = Mock()
    monkeypatch.setattr(svc, "update_user_active", update)
    with pytest.raises(PermissionError, match="own account"):
        svc.change_user_active_service("admin-1", False, "admin-1")
    update.assert_not_called()


def test_cannot_deactivate_last_active_admin(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=ADMIN))
    monkeypatch.setattr(svc, "count_active_admins", Mock(return_value=1))
    update = Mock()
    monkeypatch.setattr(svc, "update_user_active", update)
    with pytest.raises(PermissionError, match="last active admin"):
        svc.change_user_active_service("admin-1", False, "other-admin")
    update.assert_not_called()


@pytest.mark.parametrize("active", [False, True])
def test_deactivate_and_reactivate_technician(monkeypatch, active):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=TECH))
    update = Mock(return_value={**TECH, "is_active": active})
    monkeypatch.setattr(svc, "update_user_active", update)
    result = svc.change_user_active_service("tech-1", active, "admin-1")
    assert result["is_active"] is active
    update.assert_called_once_with("tech-1", active)


def test_create_user_does_not_return_password(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_email", Mock(return_value=None))
    monkeypatch.setattr(svc, "hash_password", Mock(return_value="bcrypt-hash"))
    insert = Mock(return_value=TECH)
    monkeypatch.setattr(svc, "create_user", insert)
    result = svc.create_user_service(UserCreate(
        display_name="Tech", email="tech@example.com",
        password="LongPass123!", role="technician",
    ))
    assert "password" not in result and "password_hash" not in result
    assert insert.call_args.args[0]["password_hash"] == "bcrypt-hash"


def test_duplicate_email_cannot_create_user(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_email", Mock(return_value=TECH))
    insert = Mock()
    monkeypatch.setattr(svc, "create_user", insert)
    with pytest.raises(ValueError, match="Email already exists"):
        svc.create_user_service(UserCreate(
            display_name="Tech", email="tech@example.com",
            password="LongPass123!", role="technician",
        ))
    insert.assert_not_called()


def test_deactivation_missing_user(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=None))
    with pytest.raises(ValueError, match="User not found"):
        svc.change_user_active_service("missing", False, "admin-1")


def test_deactivation_failed_update_is_reported(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=TECH))
    monkeypatch.setattr(svc, "update_user_active", Mock(return_value=None))
    with pytest.raises(ValueError, match="User not found"):
        svc.change_user_active_service("tech-1", False, "admin-1")


def test_role_update_failed_update_is_reported(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=TECH))
    monkeypatch.setattr(svc, "update_user_role", Mock(return_value=None))
    with pytest.raises(ValueError, match="User not found"):
        svc.update_user_role_service("tech-1", RoleUpdate(role="team_lead"))
