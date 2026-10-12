from db.supabase_client import supabase


def get_dashboard_rows(table: str, columns: str):
    rows = []
    page_size = 1000
    start = 0

    while True:
        response = (
            supabase.table(table)
            .select(columns)
            .order("id")
            .range(start, start + page_size - 1)
            .execute()
        )

        batch = response.data or []
        rows.extend(batch)

        if len(batch) < page_size:
            break

        start += page_size

    return rows


def get_dashboard_data():
    return {
        "aircraft": get_dashboard_rows(
            "aircraft",
            "id,status"
        ),
        "reports": get_dashboard_rows(
            "maintenance_reports",
            "id,status,priority"
        ),
        "inspections": get_dashboard_rows(
            "inspections",
            "id,status,due_date"
        ),
    }
