
import type { AuthUser } from "./auth";

// User information returned by the Backend
export interface UserListItem extends AuthUser {
  // May not be available until the Backend is updated
  is_active?: boolean;
}
