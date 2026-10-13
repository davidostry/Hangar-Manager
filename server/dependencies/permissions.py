from fastapi import Depends, HTTPException

from dependencies.auth import get_current_user
from schemas.user_schema import UserRole


def require_roles(*allowed_roles: UserRole):

    def check_role(current_user=Depends(get_current_user)):
        user_role = current_user.get("role")

        allowed_values = [role.value for role in allowed_roles]

        if user_role not in allowed_values:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )

        return current_user

    return check_role