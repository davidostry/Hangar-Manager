
import api from "./api";

import type { UserRole } from "../types/auth";

import type {
  UserListItem,
  UserCreateRequest,
  UserRoleUpdateRequest,
} from "../types/users";

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
    typeof value.display_name !== "string" ||
    typeof value.email !== "string" ||
    !isUserRole(value.role) ||
    typeof value.is_active !== "boolean"
  ) {
    throw new Error(
      "Invalid user data received from the Backend.",
    );
  }

  return {
    id: value.id,
    display_name: value.display_name,
    email: value.email,
    role: value.role,
    is_active: value.is_active,
  };
}

// ========================================
// GET ALL USERS
// ========================================

export async function getUsers(): Promise<UserListItem[]> {
  const response = await api.get<unknown>("/users");

  const data = response.data;

  const users = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.items)
      ? data.items
      : null;

  if (!users) {
    throw new Error(
      "Invalid users response: expected an array.",
    );
  }

  return users.map(parseUser);
}

// ========================================
// CREATE USER - ADMIN ONLY
// ========================================

export async function createUser(
  payload: UserCreateRequest,
): Promise<void> {
  await api.post("/users", {
    display_name: payload.display_name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    role: payload.role,
  });
}

// ========================================
// UPDATE USER ROLE - ADMIN ONLY
// ========================================

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<void> {
  const payload: UserRoleUpdateRequest = {
    role,
  };

  await api.patch(
    `/users/${encodeURIComponent(userId)}/role`,
    payload,
  );
}

// ========================================
// DEACTIVATE USER - ADMIN ONLY
// ========================================

export async function deactivateUser(
  userId: string,
): Promise<void> {
  await api.patch(
    `/users/${encodeURIComponent(userId)}/deactivate`,
  );
}

// ========================================
// REACTIVATE USER - ADMIN ONLY
// ========================================

export async function reactivateUser(
  userId: string,
): Promise<void> {
  await api.patch(
    `/users/${encodeURIComponent(userId)}/reactivate`,
  );
}
