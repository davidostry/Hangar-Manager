from db.supabase_client import supabase


def get_all_aircraft():
    response = supabase.table("aircraft").select("*").execute()
    return response.data


def get_aircraft_by_id(aircraft_id: str):
    response = (
        supabase
        .table("aircraft")
        .select("*")
        .eq("id", aircraft_id)
        .execute()
    )

    return response.data[0] if response.data else None


def create_aircraft(aircraft_data: dict):
    response = (
        supabase
        .table("aircraft")
        .insert(aircraft_data)
        .execute()
    )

    return response.data[0]


def update_aircraft(aircraft_id: str, aircraft_data: dict):
    response = (
        supabase
        .table("aircraft")
        .update(aircraft_data)
        .eq("id", aircraft_id)
        .execute()
    )

    return response.data[0] if response.data else None


def delete_aircraft(aircraft_id: str):
    response = (
        supabase
        .table("aircraft")
        .delete()
        .eq("id", aircraft_id)
        .execute()
    )

    return response.data[0] if response.data else None