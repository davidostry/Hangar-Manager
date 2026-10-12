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

const USE_MOCK_AUTH =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_MOCK_AUTH === "true";

interface MockAccount {
  email: string;
  password: string;
  token: string;
  user: AuthUser;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: "admin@hangarmanager.test",
    password: "Admin123!",
    token: "mock-token-admin",
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "admin@hangarmanager.test",
      display_name: "Demo Admin",
      role: "admin",
    },
  },
  {
    email: "technician@hangarmanager.test",
    password: "Technician123!",
    token: "mock-token-technician",
    user: {
      id: "22222222-2222-4222-8222-222222222222",
      email: "technician@hangarmanager.test",
      display_name: "Demo Technician",
      role: "technician",
    },
  },
];

export async function login(
  credentials: LoginRequest,
): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    const email = credentials.email.trim().toLowerCase();

    const account = MOCK_ACCOUNTS.find(
      (mockAccount) =>
        mockAccount.email === email &&
        mockAccount.password === credentials.password,
    );

    if (!account) {
      throw new Error(
        "Invalid demo credentials. Check the test accounts.",
      );
    }

    saveAccessToken(account.token);

    return account.user;
  }

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
  if (USE_MOCK_AUTH) {
    const token = getAccessToken();

    const account = MOCK_ACCOUNTS.find(
      (mockAccount) => mockAccount.token === token,
    );

    if (!account) {
      clearAccessToken();
      throw new Error("No valid demo session.");
    }

    return account.user;
  }

  const response = await api.get<AuthUser>("/auth/me");

  return response.data;
}

export function logout(): void {
  clearAccessToken();
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}