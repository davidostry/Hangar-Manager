from datetime import datetime, timezone

from dal.aircraft_dal import (
    get_all_aircraft,
    get_aircraft_by_id,
    create_aircraft,
    update_aircraft,
    delete_aircraft,
)

from schemas.aircraft_schema import AircraftCreate, AircraftUpdate


def get_all_aircraft_service():
    return get_all_aircraft()


def get_aircraft_by_id_service(aircraft_id: str):
    aircraft = get_aircraft_by_id(aircraft_id)

    if not aircraft:
        raise ValueError("Aircraft not found")

    return aircraft


def create_aircraft_service(data: AircraftCreate):
    aircraft_data = data.model_dump()

    aircraft_data["status"] = "Available"

    return create_aircraft(aircraft_data)


def update_aircraft_service(aircraft_id: str, data: AircraftUpdate):
    aircraft = get_aircraft_by_id(aircraft_id)

    if not aircraft:
        raise ValueError("Aircraft not found")

    updates = data.model_dump(exclude_none=True)

    if not updates:
        return aircraft

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    return update_aircraft(aircraft_id, updates)


def delete_aircraft_service(aircraft_id: str):
    aircraft = get_aircraft_by_id(aircraft_id)

    if not aircraft:
        raise ValueError("Aircraft not found")

    return delete_aircraft(aircraft_id)