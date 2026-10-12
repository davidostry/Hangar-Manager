from db.supabase_client import supabase


def get_all_reports(aircraft_id: str | None = None):
    query = supabase.table("maintenance_reports").select("*")

    if aircraft_id:
        query = query.eq("aircraft_id", aircraft_id)

    response = query.execute()
    return response.data


def get_report_by_id(report_id: str):
    response = (
        supabase.table("maintenance_reports")
        .select("*")
        .eq("id", report_id)
        .execute()
    )

    return response.data[0] if response.data else None


def create_report(report_data: dict):
    response = (
        supabase.table("maintenance_reports")
        .insert(report_data)
        .execute()
    )

    return response.data[0]


def update_report(report_id: str, report_data: dict):
    response = (
        supabase.table("maintenance_reports")
        .update(report_data)
        .eq("id", report_id)
        .execute()
    )

    return response.data[0] if response.data else None


def delete_report(report_id: str):
    response = (
        supabase.table("maintenance_reports")
        .delete()
        .eq("id", report_id)
        .execute()
    )

    return response.data[0] if response.data else None


def get_active_reports_by_aircraft(aircraft_id: str):
    response = (
        supabase.table("maintenance_reports")
        .select("*")
        .eq("aircraft_id", aircraft_id)
        .in_("status", ["Open", "InProgress"])
        .execute()
    )

    return response.data
