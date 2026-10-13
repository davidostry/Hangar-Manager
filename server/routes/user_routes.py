from fastapi import APIRouter, Depends


from controllers.user_controller import (
    update_user_role_controller,
    get_all_users_controller,
    create_user_controller,
    change_user_active_controller
)

from schemas.user_schema import (
    RoleUpdate,
    UserRole,
    UserResponse,
    UserCreate
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
    return get_all_users_controller(
        current_user["role"]
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=201
)
def create_new_user(
    data: UserCreate,
    current_user=Depends(
        require_roles(UserRole.ADMIN)
    )
):
    return create_user_controller(data)


@router.patch(
    "/{user_id}/deactivate",
    response_model=UserResponse
)
def deactivate_user(
    user_id: str,
    current_user=Depends(
        require_roles(UserRole.ADMIN)
    )
):
    return change_user_active_controller(
        user_id,
        False,
        current_user["id"]
    )


@router.patch(
    "/{user_id}/reactivate",
    response_model=UserResponse
)
def reactivate_user(
    user_id: str,
    current_user=Depends(
        require_roles(UserRole.ADMIN)
    )
):
    return change_user_active_controller(
        user_id,
        True,
        current_user["id"]
    )
