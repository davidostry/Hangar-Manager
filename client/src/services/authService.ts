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

export async function login(
  credentials: LoginRequest,
): Promise<AuthUser> {
  const response = await api.post<LoginResponse>(
    "/auth/login",
    credentials,
  );

  const data = response.data;

  if (
    !data.access_token ||
    data.token_type !== "bearer" ||
    !data.user
  ) {
    throw new Error(
      "The server returned an invalid login response.",
    );
  }

  saveAccessToken(data.access_token);

  return data.user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/auth/me");

  return response.data;
}

export function logout(): void {
  clearAccessToken();
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}