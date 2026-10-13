from fastapi import APIRouter, Depends

from dependencies.permissions import require_roles
from schemas.user_schema import UserRole
from schemas.email_schema import EmailTestResponse

from controllers.email_controller import (
    send_test_email_controller,
)


router = APIRouter(
    prefix="/emails",
    tags=["Emails"]
)


@router.post(
    "/test",
    response_model=EmailTestResponse
)
def send_test_email(
    current_user=Depends(
        require_roles(UserRole.ADMIN)
    )
):
    return send_test_email_controller()
