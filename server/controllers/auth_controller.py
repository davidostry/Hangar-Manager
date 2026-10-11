from fastapi import HTTPException

from schemas.auth_schema import RegisterRequest, LoginRequest
from services.auth_service import (
    register_service,
    login_service,
    get_me_service,
)


def register_controller(data: RegisterRequest):
    try:
        return register_service(data)
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error)
        )


def login_controller(data: LoginRequest):
    try:
        return login_service(data)
    except ValueError as error:
        raise HTTPException(
            status_code=401,
            detail=str(error)
        )


def get_me_controller(user_id: str):
    try:
        return get_me_service(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )