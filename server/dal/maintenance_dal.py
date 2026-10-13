from db.supabase_client import supabase


def get_all_reports(aircraft_id: str | None = None):
    query = supabase.table("maintenance_reports").select("*")

    if aircraft_id:
        query = query.eq("aircraft_id", aircraft_id)

    response = query.execute()
    return enrich_reports(response.data or [])


def get_report_by_id(report_id: str):
    response = (
        supabase.table("maintenance_reports")
        .select("*")
        .eq("id", report_id)
        .execute()
    )

    return enrich_reports(response.data)[0] if response.data else None

def create_report(report_data: dict):
    response = (
        supabase.table("maintenance_reports")
        .insert(report_data)
        .execute()
    )

    return enrich_reports(response.data)[0]


def update_report(report_id: str, report_data: dict):
    response = (
        supabase.table("maintenance_reports")
        .update(report_data)
        .eq("id", report_id)
        .execute()
    )

    return enrich_reports(response.data)[0] if response.data else None


def delete_report(report_id: str):
    response = (
        supabase.table("maintenance_reports")
        .delete()
        .eq("id", report_id)
        .execute()
    )

    return enrich_reports(response.data)[0] if response.data else None

def get_active_reports_by_aircraft(aircraft_id: str):
    response = (
        supabase.table("maintenance_reports")
        .select("*")
        .eq("aircraft_id", aircraft_id)
        .in_("status", ["Open", "InProgress"])
        .execute()
    )

    return response.data



def enrich_reports(reports: list[dict]) -> list[dict]:
    if not reports:
        return []

    user_ids = {
        str(user_id)
        for report in reports
        for user_id in (
            report.get("reported_by"),
            report.get("assigned_to"),
        )
        if user_id
    }

    aircraft_ids = {
        str(report["aircraft_id"])
        for report in reports
        if report.get("aircraft_id")
    }

    user_names = {}
    aircraft_numbers = {}

    if user_ids:
        users_response = (
            supabase.table("users")
            .select("id, display_name")
            .in_("id", sorted(user_ids))
            .execute()
        )

        user_names = {
            str(user["id"]): user["display_name"]
            for user in users_response.data or []
        }

    if aircraft_ids:
        aircraft_response = (
            supabase.table("aircraft")
            .select("id, tail_number")
            .in_("id", sorted(aircraft_ids))
            .execute()
        )

        aircraft_numbers = {
            str(aircraft["id"]): aircraft["tail_number"]
            for aircraft in aircraft_response.data or []
        }

    result = []

    for report in reports:
        enriched = {
            **report,
            "reported_by_name": user_names.get(
                str(report.get("reported_by"))
            ),
            "assigned_to_name": user_names.get(
                str(report.get("assigned_to"))
            ),
            "aircraft_tail_number": aircraft_numbers.get(
                str(report.get("aircraft_id"))
            ),
        }

        result.append(enriched)

    return result
