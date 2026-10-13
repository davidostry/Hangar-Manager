
import type { AuthUser, UserRole } from "./auth";

// User returned by the Backend
export interface UserListItem extends AuthUser {
  is_active: boolean;
}

// POST /users
export interface UserCreateRequest {
  display_name: string;
  email: string;
  password: string;
  role: UserRole;
}

// PATCH /users/{user_id}/role
export interface UserRoleUpdateRequest {
  role: UserRole;
}
