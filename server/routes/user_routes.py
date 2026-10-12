from fastapi import APIRouter, Depends


from controllers.user_controller import (
    update_user_role_controller,
    get_all_users_controller,
)

from schemas.user_schema import (
    RoleUpdate,
    UserRole,
    UserResponse,
)

from dependencies.permissions import require_roles

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.patch("/{user_id}/role")
def update_user_role(
    user_id: str,
    data: RoleUpdate,
    current_user=Depends(
        require_roles(UserRole.ADMIN)
    )
):
    return update_user_role_controller(
        user_id,
        data
    )


@router.get("", response_model=list[UserResponse])
def get_users(
    current_user=Depends(
        require_roles(
            UserRole.TEAM_LEAD,
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN,
        )
    )
):
    return get_all_users_controller()
