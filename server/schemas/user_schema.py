from enum import Enum
from pydantic import BaseModel

from uuid import UUID
from pydantic import EmailStr

class UserRole(str, Enum):
    TECHNICIAN = "technician"
    TEAM_LEAD = "team_lead"
    HANGAR_MANAGER = "hangar_manager"
    ADMIN = "admin"



class RoleUpdate(BaseModel):
    role: UserRole


class UserResponse(BaseModel):
    id: UUID
    display_name: str
    email: EmailStr
    role: UserRole
