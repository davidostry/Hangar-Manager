from db.supabase_client import supabase


def get_all_inspections(aircraft_id: str | None = None):
    query = supabase.table("inspections").select("*")

    if aircraft_id:
        query = query.eq("aircraft_id", aircraft_id)

    response = query.execute()
    return enrich_inspections(response.data or [])


def get_inspection_by_id(inspection_id: str):
    response = (
        supabase.table("inspections")
        .select("*")
        .eq("id", inspection_id)
        .execute()
    )

    return enrich_inspections(response.data)[0] if response.data else None


def create_inspection(inspection_data: dict):
    response = (
        supabase.table("inspections")
        .insert(inspection_data)
        .execute()
    )

    return enrich_inspections(response.data)[0]


def update_inspection(inspection_id: str, updates: dict):
    response = (
        supabase.table("inspections")
        .update(updates)
        .eq("id", inspection_id)
        .execute()
    )

    return enrich_inspections(response.data)[0] if response.data else None


def delete_inspection(inspection_id: str):
    response = (
        supabase.table("inspections")
        .delete()
        .eq("id", inspection_id)
        .execute()
    )

    return enrich_inspections(response.data)[0] if response.data else None


def get_scheduled_inspections_by_aircraft(aircraft_id: str):
    response = (
        supabase.table("inspections")
        .select("*")
        .eq("aircraft_id", aircraft_id)
        .eq("status", "Scheduled")
        .execute()
    )

    return response.data



def enrich_inspections(inspections: list[dict]) -> list[dict]:
    if not inspections:
        return []

    aircraft_ids = sorted({
        str(inspection["aircraft_id"])
        for inspection in inspections
        if inspection.get("aircraft_id")
    })

    aircraft_numbers = {}

    if aircraft_ids:
        response = (
            supabase.table("aircraft")
            .select("id, tail_number")
            .in_("id", aircraft_ids)
            .execute()
        )

        aircraft_numbers = {
            str(aircraft["id"]): aircraft["tail_number"]
            for aircraft in response.data or []
        }

    return [
        {
            **inspection,
            "aircraft_tail_number": aircraft_numbers.get(
                str(inspection.get("aircraft_id"))
            ),
        }
        for inspection in inspections
    ]
