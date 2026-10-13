
from dal.user_dal import (
    get_user_by_id,
    update_user_role,
    get_all_users,
    create_user,
    get_user_by_email,
    update_user_active,
    count_active_admins
)

from schemas.user_schema import RoleUpdate, UserRole, UserCreate
from utils.password import hash_password


def update_user_role_service(user_id: str, data: RoleUpdate):
    user = get_user_by_id(user_id)

    if not user:
        raise ValueError("User not found")

    if (
        user["role"] == UserRole.ADMIN.value
        and user["is_active"]
        and data.role != UserRole.ADMIN
        and count_active_admins() <= 1
    ):
        raise PermissionError(
            "Cannot change role of the last active admin"
        )

    updated_user = update_user_role(
        user_id,
        data.role.value
    )

    if not updated_user:
        raise ValueError("User not found")

    return {
        "id": updated_user["id"],
        "email": updated_user["email"],
        "display_name": updated_user["display_name"],
        "role": updated_user["role"],
        "is_active": updated_user["is_active"],
    }



def get_all_users_service(user_role: str):
    if user_role == UserRole.TEAM_LEAD.value:
        return get_all_users(
            role=UserRole.TECHNICIAN.value
        )

    if user_role in (
        UserRole.ADMIN.value,
        UserRole.HANGAR_MANAGER.value,
    ):
        return get_all_users()

    raise PermissionError("Insufficient permissions")


def create_user_service(data: UserCreate):
    existing_user = get_user_by_email(data.email)

    if existing_user:
        raise ValueError("Email already exists")

    user_data = {
        "display_name": data.display_name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": data.role.value,
    }

    user = create_user(user_data)

    return {
        "id": user["id"],
        "display_name": user["display_name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user["is_active"],
    }


def change_user_active_service(
    user_id: str,
    is_active: bool,
    current_user_id: str
):
    user = get_user_by_id(user_id)

    if not user:
        raise ValueError("User not found")

    if not is_active:
        if str(user["id"]) == str(current_user_id):
            raise PermissionError(
                "Cannot deactivate your own account"
            )

        if (
            user["role"] == UserRole.ADMIN.value
            and user["is_active"]
            and count_active_admins() <= 1
        ):
            raise PermissionError(
                "Cannot deactivate the last active admin"
            )

    updated_user = update_user_active(
        user_id,
        is_active
    )

    if not updated_user:
        raise ValueError("User not found")

    return {
        "id": updated_user["id"],
        "display_name": updated_user["display_name"],
        "email": updated_user["email"],
        "role": updated_user["role"],
        "is_active": updated_user["is_active"],
    }
