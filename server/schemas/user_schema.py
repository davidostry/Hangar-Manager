from enum import Enum
from pydantic import BaseModel

class UserRole(str, Enum):
    TECHNICIAN = "technician"
    TEAM_LEAD = "team_lead"
    HANGAR_MANAGER = "hangar_manager"
    ADMIN = "admin"



class RoleUpdate(BaseModel):
    role: UserRole