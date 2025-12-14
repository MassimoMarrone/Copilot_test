/**
 * Tipi unificati per User e Auth
 * Usare questa definizione in tutto il frontend invece di duplicarla
 */

export type UserType = "client" | "provider" | "admin";

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  bio?: string;
  avatarUrl?: string;
  userType: UserType;
  isClient: boolean;
  isProvider: boolean;
  isAdmin: boolean;
  adminLevel?: "super" | "standard";
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  userType?: UserType;
  message?: string;
  error?: string;
  code?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  acceptedTerms: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
}
