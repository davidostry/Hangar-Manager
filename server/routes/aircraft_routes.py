from fastapi import APIRouter

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
def get_all_aircraft():
    return get_all_aircraft_controller()


@router.get("/{aircraft_id}", response_model=AircraftResponse)
def get_aircraft_by_id(aircraft_id: str):
    return get_aircraft_by_id_controller(aircraft_id)


@router.post("/", response_model=AircraftResponse, status_code=201)
def create_aircraft(data: AircraftCreate):
    return create_aircraft_controller(data)


@router.patch("/{aircraft_id}", response_model=AircraftResponse)
def update_aircraft(aircraft_id: str, data: AircraftUpdate):
    return update_aircraft_controller(aircraft_id, data)


@router.delete("/{aircraft_id}", response_model=AircraftResponse)
def delete_aircraft(aircraft_id: str):
    return delete_aircraft_controller(aircraft_id)