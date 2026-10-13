
from fastapi import HTTPException

from schemas.maintenance_schema import (
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceAssign,
    MaintenanceResolve,
)

from services.maintenance_service import (
    get_all_reports_service,
    get_report_by_id_service,
    create_report_service,
    update_report_service,
    assign_report_service,
    resolve_report_service,
    cancel_report_service,
    delete_report_service,
)


def get_all_reports_controller(aircraft_id: str | None = None):
    return get_all_reports_service(aircraft_id)


def get_report_by_id_controller(report_id: str):
    try:
        return get_report_by_id_service(report_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


def create_report_controller(
    data: MaintenanceCreate,
    user_id: str
):
    try:
        return create_report_service(data, user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


def update_report_controller(
    report_id: str,
    data: MaintenanceUpdate
):
    try:
        return update_report_service(report_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=404 if str(error).endswith("not found") else 409,
            detail=str(error)
        )


def assign_report_controller(
    report_id: str,
    data: MaintenanceAssign
):
    try:
        return assign_report_service(report_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=404 if str(error).endswith("not found") else 409,
            detail=str(error)
        )


def resolve_report_controller(
    report_id: str,
    data: MaintenanceResolve
):
    try:
        return resolve_report_service(report_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=404 if str(error).endswith("not found") else 409,
            detail=str(error)
        )


def cancel_report_controller(report_id: str):
    try:
        return cancel_report_service(report_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404 if str(error).endswith("not found") else 409,
            detail=str(error)
        )


def delete_report_controller(report_id: str):
    try:
        return delete_report_service(report_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404 if str(error).endswith("not found") else 409,
            detail=str(error)
        )
