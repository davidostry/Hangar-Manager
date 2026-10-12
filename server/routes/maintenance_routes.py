
from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from dependencies.permissions import require_roles
from schemas.user_schema import UserRole

from controllers.maintenance_controller import (
    get_all_reports_controller,
    get_report_by_id_controller,
    create_report_controller,
    update_report_controller,
    assign_report_controller,
    resolve_report_controller,
    cancel_report_controller,
    delete_report_controller,
)

from schemas.maintenance_schema import (
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceAssign,
    MaintenanceResolve,
    MaintenanceResponse,
)


router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"]
)


@router.get("/", response_model=list[MaintenanceResponse])
def get_all_reports(
    aircraft_id: str | None = None,
    current_user=Depends(get_current_user)
):
    return get_all_reports_controller(aircraft_id)


@router.get("/{report_id}", response_model=MaintenanceResponse)
def get_report_by_id(
    report_id: str,
    current_user=Depends(get_current_user)
):
    return get_report_by_id_controller(report_id)


@router.post("/", response_model=MaintenanceResponse, status_code=201)
def create_report(
    data: MaintenanceCreate,
    current_user=Depends(get_current_user)
):
    return create_report_controller(
        data,
        current_user["id"]
    )


@router.patch("/{report_id}", response_model=MaintenanceResponse)
def update_report(
    report_id: str,
    data: MaintenanceUpdate,
    current_user=Depends(
        require_roles(
            UserRole.TEAM_LEAD,
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return update_report_controller(report_id, data)


@router.patch("/{report_id}/assign", response_model=MaintenanceResponse)
def assign_report(
    report_id: str,
    data: MaintenanceAssign,
    current_user=Depends(
        require_roles(
            UserRole.TEAM_LEAD,
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return assign_report_controller(report_id, data)


@router.patch("/{report_id}/resolve", response_model=MaintenanceResponse)
def resolve_report(
    report_id: str,
    data: MaintenanceResolve,
    current_user=Depends(
        require_roles(
            UserRole.TEAM_LEAD,
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return resolve_report_controller(report_id, data)


@router.patch("/{report_id}/cancel", response_model=MaintenanceResponse)
def cancel_report(
    report_id: str,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return cancel_report_controller(report_id)


@router.delete("/{report_id}", response_model=MaintenanceResponse)
def delete_report(
    report_id: str,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return delete_report_controller(report_id)
