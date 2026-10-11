from fastapi import HTTPException

from schemas.aircraft_schema import AircraftCreate, AircraftUpdate
from services.aircraft_service import (
    get_all_aircraft_service,
    get_aircraft_by_id_service,
    create_aircraft_service,
    update_aircraft_service,
    delete_aircraft_service,
)


def get_all_aircraft_controller():
    return get_all_aircraft_service()


def get_aircraft_by_id_controller(aircraft_id: str):
    try:
        return get_aircraft_by_id_service(aircraft_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


def create_aircraft_controller(data: AircraftCreate):
    return create_aircraft_service(data)


def update_aircraft_controller(aircraft_id: str, data: AircraftUpdate):
    try:
        return update_aircraft_service(aircraft_id, data)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


def delete_aircraft_controller(aircraft_id: str):
    try:
        return delete_aircraft_service(aircraft_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))