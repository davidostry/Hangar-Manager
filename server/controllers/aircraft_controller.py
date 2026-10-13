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


def _raise_aircraft_database_conflict(error: Exception):
    # PostgREST uses PostgreSQL SQLSTATE codes on APIError instances.
    code = getattr(error, "code", None)
    if code == "23505":
        raise HTTPException(
            status_code=409,
            detail="An aircraft with the same tail number or serial number already exists.",
        ) from error
    if code == "23503":
        raise HTTPException(
            status_code=409,
            detail="Aircraft is referenced by other records and cannot be deleted.",
        ) from error
    raise error


def create_aircraft_controller(data: AircraftCreate):
    try:
        return create_aircraft_service(data)
    except Exception as error:
        _raise_aircraft_database_conflict(error)


def update_aircraft_controller(aircraft_id: str, data: AircraftUpdate):
    try:
        return update_aircraft_service(aircraft_id, data)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except Exception as error:
        _raise_aircraft_database_conflict(error)


def delete_aircraft_controller(aircraft_id: str):
    try:
        return delete_aircraft_service(aircraft_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except Exception as error:
        _raise_aircraft_database_conflict(error)