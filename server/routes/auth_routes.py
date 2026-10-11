from fastapi import APIRouter, Depends

from controllers.auth_controller import (
    register_controller,
    login_controller,
    get_me_controller,
)
from dependencies.auth import get_current_user
from schemas.auth_schema import RegisterRequest, LoginRequest


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=201)
def register(data: RegisterRequest):
    return register_controller(data)


@router.post("/login")
def login(data: LoginRequest):
    return login_controller(data)


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return get_me_controller(current_user["id"])