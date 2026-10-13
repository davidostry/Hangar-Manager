from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user

from controllers.dashboard_controller import (
    get_dashboard_summary_controller,
)

from schemas.dashboard_schema import DashboardResponse


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get(
    "/summary",
    response_model=DashboardResponse
)
def get_dashboard_summary(
    current_user=Depends(get_current_user)
):
    return get_dashboard_summary_controller()
