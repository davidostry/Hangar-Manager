from fastapi import HTTPException

from schemas.user_schema import RoleUpdate
from services.user_service import (
    update_user_role_service,
    get_all_users_service,
)


def update_user_role_controller(
    user_id: str,
    data: RoleUpdate
):
    try:
        return update_user_role_service(
            user_id,
            data
        )

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

def get_all_users_controller():
    return get_all_users_service()    