"""Authentication logic and JWT dependency without real user database."""
from unittest.mock import Mock

import pytest
import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from schemas.auth_schema import LoginRequest
from services import auth_service as svc
from dependencies import auth
from dependencies.permissions import require_roles
from schemas.user_schema import UserRole


USER = {
    "id": "uid-1", "email": "tech@example.com", "display_name": "Tech",
    "password_hash": "hashed", "role": "technician", "is_active": True,
}


def login_data():
    return LoginRequest(email="tech@example.com", password="TestPass123!")


def test_login_returns_bearer_token(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_email", Mock(return_value=USER))
    monkeypatch.setattr(svc, "verify_password", Mock(return_value=True))
    make_token = Mock(return_value="fake-jwt")
    monkeypatch.setattr(svc, "create_access_token", make_token)
    result = svc.login_service(login_data())
    assert result["access_token"] == "fake-jwt"
    assert result["token_type"] == "bearer"
    assert result["user"]["role"] == "technician"
    assert "password_hash" not in result["user"]
    make_token.assert_called_once_with("uid-1", "technician")


@pytest.mark.parametrize("exists,password_ok,active,detail", [
    (False, True, True, "Invalid email or password"),
    (True, False, True, "Invalid email or password"),
    (True, True, False, "Account inactive"),
])
def test_login_rejects_invalid_or_inactive_users(
    monkeypatch, exists, password_ok, active, detail,
):
    monkeypatch.setattr(svc, "get_user_by_email", Mock(
        return_value={**USER, "is_active": active} if exists else None,
    ))
    monkeypatch.setattr(svc, "verify_password", Mock(return_value=password_ok))
    make_token = Mock()
    monkeypatch.setattr(svc, "create_access_token", make_token)
    with pytest.raises(ValueError, match=detail):
        svc.login_service(login_data())
    make_token.assert_not_called()


def test_missing_authorization_header_is_401():
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(None)
    assert exc.value.status_code == 401


def test_expired_token_is_401(monkeypatch):
    monkeypatch.setattr(auth.jwt, "decode", Mock(side_effect=jwt.ExpiredSignatureError))
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="expired-token",
        ))
    assert exc.value.status_code == 401


def test_missing_user_id_in_jwt_is_401(monkeypatch):
    monkeypatch.setattr(auth.jwt, "decode", Mock(return_value={"role": "admin"}))
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="bad-payload",
        ))
    assert exc.value.status_code == 401


@pytest.mark.parametrize("db_user", [None, {**USER, "is_active": False}])
def test_old_jwt_rejected_if_user_deleted_or_inactive(monkeypatch, db_user):
    monkeypatch.setattr(auth.jwt, "decode", Mock(return_value={
        "id": "uid-1", "role": "admin",  # stale role does not bypass DB
    }))
    monkeypatch.setattr(auth, "get_user_by_id", Mock(return_value=db_user))
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="old-jwt",
        ))
    assert exc.value.status_code == 401


def test_authorized_role_is_read_from_database_not_stale_token(monkeypatch):
    monkeypatch.setattr(auth.jwt, "decode", Mock(return_value={
        "id": "uid-1", "role": "admin",
    }))
    monkeypatch.setattr(auth, "get_user_by_id", Mock(return_value=USER))
    user = auth.get_current_user(HTTPAuthorizationCredentials(
        scheme="Bearer", credentials="old-jwt",
    ))
    assert user["role"] == "technician"


@pytest.mark.parametrize("role,allowed", [
    ("admin", True), ("technician", False), ("hangar_manager", False),
])
def test_require_roles_enforces_admin_only(role, allowed):
    guard = require_roles(UserRole.ADMIN)
    if allowed:
        assert guard(current_user={"role": role})["role"] == "admin"
    else:
        with pytest.raises(HTTPException) as exc:
            guard(current_user={"role": role})
        assert exc.value.status_code == 403


def test_register_service_hashes_password_and_uses_technician_role(monkeypatch):
    # The public register route was removed; this only checks existing service logic.
    from schemas.auth_schema import RegisterRequest
    monkeypatch.setattr(svc, "get_user_by_email", Mock(return_value=None))
    monkeypatch.setattr(svc, "hash_password", Mock(return_value="bcrypt-hash"))
    insert = Mock(side_effect=lambda payload: {"id": "uid-2", **payload})
    monkeypatch.setattr(svc, "create_user", insert)
    monkeypatch.setattr(svc, "create_access_token", Mock(return_value="test-token"))
    result = svc.register_service(RegisterRequest(
        email="new@example.com", password="TestPassword123!", display_name="New",
    ))
    assert result["access_token"] == "test-token"
    assert result["user"]["role"] == "technician"
    assert insert.call_args.args[0]["password_hash"] == "bcrypt-hash"


def test_register_service_rejects_duplicate_email(monkeypatch):
    from schemas.auth_schema import RegisterRequest
    monkeypatch.setattr(svc, "get_user_by_email", Mock(return_value=USER))
    insert = Mock()
    monkeypatch.setattr(svc, "create_user", insert)
    with pytest.raises(ValueError, match="Email already exists"):
        svc.register_service(RegisterRequest(
            email="tech@example.com", password="TestPassword123!", display_name="Tech",
        ))
    insert.assert_not_called()


def test_get_me_service_excludes_password(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=USER))
    result = svc.get_me_service("uid-1")
    assert result["id"] == "uid-1"
    assert "password_hash" not in result


def test_get_me_service_rejects_missing_user(monkeypatch):
    monkeypatch.setattr(svc, "get_user_by_id", Mock(return_value=None))
    with pytest.raises(ValueError, match="User not found"):
        svc.get_me_service("bad-id")
