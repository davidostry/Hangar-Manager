
from dal.user_dal import (
    get_user_by_id,
    update_user_role,
    get_all_users,
)

from schemas.user_schema import RoleUpdate, UserRole


def update_user_role_service(user_id: str, data: RoleUpdate):
    user = get_user_by_id(user_id)

    if not user:
        raise ValueError("User not found")

    updated_user = update_user_role(
        user_id,
        data.role.value
    )

    return {
        "id": updated_user["id"],
        "email": updated_user["email"],
        "display_name": updated_user["display_name"],
        "role": updated_user["role"],
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
