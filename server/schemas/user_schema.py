from enum import Enum


class UserRole(str, Enum):
    TECHNICIAN = "technician"
    TEAM_LEAD = "team_lead"
    HANGAR_MANAGER = "hangar_manager"
    ADMIN = "admin"