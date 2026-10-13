from fastapi import HTTPException

from schemas.user_schema import RoleUpdate, UserCreate, UserRole
from services.user_service import (
    update_user_role_service,
    get_all_users_service,
    create_user_service,
    change_user_active_service,
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


def get_all_users_controller(user_role: str):
    try:
        return get_all_users_service(user_role)

    except PermissionError as error:
        raise HTTPException(
            status_code=403,
            detail=str(error)
        )


def create_user_controller(data: UserCreate):
    try:
        return create_user_service(data)

    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error)
        )

def change_user_active_controller(
    user_id: str,
    is_active: bool,
    current_user_id: str
):
    try:
        return change_user_active_service(
            user_id,
            is_active,
            current_user_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except PermissionError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error)
        )
