
import api from "./api";

import type { UserRole } from "../types/auth";
import type { UserListItem } from "../types/users";

// ========================================
// VALIDATION HELPERS
// ========================================

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "admin" ||
    value === "hangar_manager" ||
    value === "team_lead" ||
    value === "technician"
  );
}

function parseUser(value: unknown): UserListItem {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.email !== "string" ||
    typeof value.display_name !== "string" ||
    !isUserRole(value.role)
  ) {
    throw new Error(
      "Invalid user data received from the Backend.",
    );
  }

  if (
    value.is_active !== undefined &&
    value.is_active !== null &&
    typeof value.is_active !== "boolean"
  ) {
    throw new Error(
      "Invalid user status received from the Backend.",
    );
  }

  return {
    id: value.id,
    email: value.email,
    display_name: value.display_name,
    role: value.role,
    ...(typeof value.is_active === "boolean"
      ? { is_active: value.is_active }
      : {}),
  };
}

// ========================================
// GET USERS
// ========================================

export async function getUsers(): Promise<UserListItem[]> {
  const response = await api.get<unknown>("/users");

  const data = response.data;

  // Supports a direct array or a paginated items array
  const users = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.items)
      ? data.items
      : null;

  if (!users) {
    throw new Error(
      "Invalid users response: expected a users array.",
    );
  }

  return users.map(parseUser);
}

export interface NewUserRequest {
  display_name: string;
  email: string;
  password: string;
  role: UserRole;
}

export async function createUser(data: NewUserRequest): Promise<UserListItem> {
  const response = await api.post<unknown>("/users", data);
  return parseUser(response.data);
}

export async function updateUserRole(
  userId: string, role: UserRole,
): Promise<UserListItem> {
  const response = await api.patch<unknown>(
    `/users/${encodeURIComponent(userId)}/role`, { role },
  );
  return parseUser(response.data);
}

export async function setUserActive(
  userId: string, isActive: boolean,
): Promise<UserListItem> {
  const action = isActive ? "reactivate" : "deactivate";
  const response = await api.patch<unknown>(
    `/users/${encodeURIComponent(userId)}/${action}`,
  );
  return parseUser(response.data);
}
