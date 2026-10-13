
import api from "./api";

import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
} from "../types/auth";

import {
  clearAccessToken,
  getAccessToken,
  saveAccessToken,
} from "./tokenStorage";

// ========================================
// LOGIN
// ========================================

export async function login(
  credentials: LoginRequest,
): Promise<AuthUser> {

  // Send credentials to the Backend
  const response = await api.post<LoginResponse>(
    "/auth/login",
    credentials,
  );

  const data = response.data;

  // Validate the login response
  if (
    !data.access_token ||
    data.token_type !== "bearer" ||
    !data.user
  ) {
    throw new Error(
      "The server returned an invalid login response.",
    );
  }

  // Save JWT token for future authenticated requests
  saveAccessToken(data.access_token);

  // Return the authenticated user
  return data.user;
}

// ========================================
// GET CURRENT USER
// ========================================

export async function getCurrentUser(): Promise<AuthUser> {

  // Request current user using the saved token
  // The API service is responsible for adding
  // the Authorization header
  const response = await api.get<AuthUser>(
    "/auth/me",
  );

  return response.data;
}

// ========================================
// LOGOUT
// ========================================

export function logout(): void {

  // Remove the stored JWT token
  clearAccessToken();
}

// ========================================
// CHECK ACCESS TOKEN
// ========================================

export function hasAccessToken(): boolean {

  // Check whether a token exists in storage
  return Boolean(getAccessToken());
}
