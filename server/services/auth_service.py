from dal.user_dal import (
    get_user_by_email,
    get_user_by_id,
    create_user,
)
from schemas.auth_schema import RegisterRequest, LoginRequest
from schemas.user_schema import UserRole
from utils.password import hash_password, verify_password
from utils.token import create_access_token


def register_service(data: RegisterRequest):
    existing_user = get_user_by_email(data.email)

    if existing_user:
        raise ValueError("Email already exists")

    user_data = {
        "email": data.email,
        "password_hash": hash_password(data.password),
        "display_name": data.display_name,
        "role": UserRole.TECHNICIAN.value,
    }

    user = create_user(user_data)

    token = create_access_token(
        str(user["id"]),
        user["role"]
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "role": user["role"],
        },
    }


def login_service(data: LoginRequest):
    user = get_user_by_email(data.email)

    if not user:
        raise ValueError("Invalid email or password")

    if not verify_password(data.password, user["password_hash"]):
        raise ValueError("Invalid email or password")

    if not user.get("is_active", False):
        raise ValueError("Account inactive")

    token = create_access_token(
        str(user["id"]),
        user["role"]
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "role": user["role"],
        },
    }


def get_me_service(user_id: str):
    user = get_user_by_id(user_id)

    if not user:
        raise ValueError("User not found")

    return {
        "id": user["id"],
        "email": user["email"],
        "display_name": user["display_name"],
        "role": user["role"],
    }