from db.supabase_client import supabase



def get_all_users(role: str | None = None):
    query = (
        supabase
        .table("users")
        .select("id, display_name, email, role, is_active")
    )

    if role is not None:
        query = query.eq("role", role)

    response = (
        query
        .order("display_name")
        .execute()
    )

    return response.data


def get_user_by_email(email: str):
    response = (
        supabase
        .table("users")
        .select("*")
        .eq("email", email)
        .execute()
    )

    return response.data[0] if response.data else None


def get_user_by_id(user_id: str):
    response = (
        supabase
        .table("users")
        .select("*")
        .eq("id", user_id)
        .execute()
    )

    return response.data[0] if response.data else None


def create_user(user_data: dict):
    response = (
        supabase
        .table("users")
        .insert(user_data)
        .execute()
    )

    return response.data[0]

def update_user_role(user_id: str, role: str):
    response = (
        supabase.table("users")
        .update({"role": role})
        .eq("id", user_id)
        .execute()
    )

    return response.data[0] if response.data else None


def update_user_active(user_id: str, is_active: bool):
    response = (
        supabase
        .table("users")
        .update({"is_active": is_active})
        .eq("id", user_id)
        .execute()
    )

    return response.data[0] if response.data else None


def count_active_admins():
    response = (
        supabase
        .table("users")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", True)
        .execute()
    )

    return len(response.data or [])
