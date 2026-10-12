
from fastapi import HTTPException

from schemas.inspection_schema import (
    InspectionCreate,
    InspectionUpdate,
    InspectionComplete,
)

from services.inspection_service import (
    get_all_inspections_service,
    get_inspection_by_id_service,
    create_inspection_service,
    update_inspection_service,
    complete_inspection_service,
    cancel_inspection_service,
    delete_inspection_service,
)


def get_all_inspections_controller(aircraft_id: str | None = None):
    try:
        return get_all_inspections_service(aircraft_id)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )


def get_inspection_by_id_controller(inspection_id: str):
    try:
        return get_inspection_by_id_service(inspection_id)
    except ValueError as error:
        raise HTTPException(
            status_code=422 if str(error).startswith("Invalid") else 404,
            detail=str(error)
        )


def create_inspection_controller(data: InspectionCreate):
    try:
        return create_inspection_service(data)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


def update_inspection_controller(
    inspection_id: str,
    data: InspectionUpdate
):
    try:
        return update_inspection_service(inspection_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=(
                422 if str(error).startswith("Invalid")
                else 404 if str(error).endswith("not found")
                else 409
            ),
            detail=str(error)
        )


def complete_inspection_controller(
    inspection_id: str,
    data: InspectionComplete,
    user_id: str
):
    try:
        return complete_inspection_service(
            inspection_id,
            data,
            user_id
        )
    except ValueError as error:
        raise HTTPException(
            status_code=(
                422 if str(error).startswith("Invalid")
                else 404 if str(error).endswith("not found")
                else 409
            ),
            detail=str(error)
        )


def cancel_inspection_controller(inspection_id: str):
    try:
        return cancel_inspection_service(inspection_id)
    except ValueError as error:
        raise HTTPException(
            status_code=(
                422 if str(error).startswith("Invalid")
                else 404 if str(error).endswith("not found")
                else 409
            ),
            detail=str(error)
        )


def delete_inspection_controller(inspection_id: str):
    try:
        return delete_inspection_service(inspection_id)
    except ValueError as error:
        raise HTTPException(
            status_code=(
                422 if str(error).startswith("Invalid")
                else 404 if str(error).endswith("not found")
                else 409
            ),
            detail=str(error)
        )
