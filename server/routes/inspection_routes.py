
from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from dependencies.permissions import require_roles
from schemas.user_schema import UserRole

from schemas.inspection_schema import (
    InspectionCreate,
    InspectionUpdate,
    InspectionComplete,
    InspectionResponse,
)

from controllers.inspection_controller import (
    get_all_inspections_controller,
    get_inspection_by_id_controller,
    create_inspection_controller,
    update_inspection_controller,
    complete_inspection_controller,
    cancel_inspection_controller,
    delete_inspection_controller,
)


router = APIRouter(
    prefix="/inspections",
    tags=["Inspections"]
)


@router.get("/", response_model=list[InspectionResponse])
def get_all_inspections(
    aircraft_id: str | None = None,
    current_user=Depends(get_current_user)
):
    return get_all_inspections_controller(aircraft_id)


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection_by_id(
    inspection_id: str,
    current_user=Depends(get_current_user)
):
    return get_inspection_by_id_controller(inspection_id)


@router.post(
    "/",
    response_model=InspectionResponse,
    status_code=201
)
def create_inspection(
    data: InspectionCreate,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return create_inspection_controller(data)


@router.patch(
    "/{inspection_id}",
    response_model=InspectionResponse
)
def update_inspection(
    inspection_id: str,
    data: InspectionUpdate,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return update_inspection_controller(inspection_id, data)


@router.patch(
    "/{inspection_id}/complete",
    response_model=InspectionResponse
)
def complete_inspection(
    inspection_id: str,
    data: InspectionComplete,
    current_user=Depends(get_current_user)
):
    return complete_inspection_controller(
        inspection_id,
        data,
        current_user["id"]
    )


@router.patch(
    "/{inspection_id}/cancel",
    response_model=InspectionResponse
)
def cancel_inspection(
    inspection_id: str,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return cancel_inspection_controller(inspection_id)


@router.delete(
    "/{inspection_id}",
    response_model=InspectionResponse
)
def delete_inspection(
    inspection_id: str,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return delete_inspection_controller(inspection_id)
