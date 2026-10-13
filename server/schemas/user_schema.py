from enum import Enum
from pydantic import BaseModel, EmailStr, Field
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
    is_active: bool

class UserCreate(BaseModel):
    display_name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole