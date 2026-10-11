from fastapi import APIRouter, Depends

from controllers.user_controller import update_user_role_controller
from dependencies.permissions import require_roles
from schemas.user_schema import RoleUpdate, UserRole


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