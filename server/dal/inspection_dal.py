
from db.supabase_client import supabase


def get_all_inspections(aircraft_id: str | None = None):
    query = supabase.table("inspections").select("*")

    if aircraft_id:
        query = query.eq("aircraft_id", aircraft_id)

    response = query.execute()
    return response.data


def get_inspection_by_id(inspection_id: str):
    response = (
        supabase.table("inspections")
        .select("*")
        .eq("id", inspection_id)
        .execute()
    )

    return response.data[0] if response.data else None


def create_inspection(inspection_data: dict):
    response = (
        supabase.table("inspections")
        .insert(inspection_data)
        .execute()
    )

    return response.data[0]


def update_inspection(inspection_id: str, updates: dict):
    response = (
        supabase.table("inspections")
        .update(updates)
        .eq("id", inspection_id)
        .execute()
    )

    return response.data[0] if response.data else None


def delete_inspection(inspection_id: str):
    response = (
        supabase.table("inspections")
        .delete()
        .eq("id", inspection_id)
        .execute()
    )

    return response.data[0] if response.data else None


def get_scheduled_inspections_by_aircraft(aircraft_id: str):
    response = (
        supabase.table("inspections")
        .select("*")
        .eq("aircraft_id", aircraft_id)
        .eq("status", "Scheduled")
        .execute()
    )

    return response.data
