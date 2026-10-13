from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from dependencies.permissions import require_roles
from schemas.user_schema import UserRole

from controllers.aircraft_controller import (
    get_all_aircraft_controller,
    get_aircraft_by_id_controller,
    create_aircraft_controller,
    update_aircraft_controller,
    delete_aircraft_controller,
)
from schemas.aircraft_schema import (
    AircraftCreate,
    AircraftUpdate,
    AircraftResponse,
)


router = APIRouter(prefix="/aircraft", tags=["Aircraft"])


@router.get("/", response_model=list[AircraftResponse])
def get_all_aircraft(
    current_user=Depends(get_current_user)
):
    return get_all_aircraft_controller()


@router.get("/{aircraft_id}", response_model=AircraftResponse)
def get_aircraft_by_id(
    aircraft_id: str,
    current_user=Depends(get_current_user)
):
    return get_aircraft_by_id_controller(aircraft_id)


@router.post("/", response_model=AircraftResponse, status_code=201)
def create_aircraft(
    data: AircraftCreate,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return create_aircraft_controller(data)


@router.patch("/{aircraft_id}", response_model=AircraftResponse)
def update_aircraft(
    aircraft_id: str,
    data: AircraftUpdate,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return update_aircraft_controller(aircraft_id, data)


@router.delete("/{aircraft_id}", response_model=AircraftResponse)
def delete_aircraft(
    aircraft_id: str,
    current_user=Depends(
        require_roles(
            UserRole.HANGAR_MANAGER,
            UserRole.ADMIN
        )
    )
):
    return delete_aircraft_controller(aircraft_id)