
 // ========================================
 // USER ROLES
 // ========================================

export type UserRole =
  | "admin"
  | "hangar_manager"
  | "team_lead"
  | "technician";

// ========================================
// AUTHENTICATED USER
// ========================================

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
}

// ========================================
// LOGIN REQUEST
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
}

// ========================================
 // LOGIN RESPONSE
 // ========================================

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}
