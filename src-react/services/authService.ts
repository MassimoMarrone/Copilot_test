import { get, post, del, upload } from "./api";

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  bio?: string;
  avatarUrl?: string;
  userType: "client" | "provider" | "admin";
  isClient: boolean;
  isProvider: boolean;
  isAdmin?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  userType?: string;
  isClient?: boolean;
  isProvider?: boolean;
  error?: string;
}

export const authService = {
  // Register a new user
  register: async (data: any): Promise<AuthResponse> => {
    return post<AuthResponse>("/api/register", data);
  },

  // Login user
  login: async (data: any): Promise<AuthResponse> => {
    return post<AuthResponse>("/api/login", data);
  },

  // Google Login
  googleLogin: async (
    token: string,
    acceptedTerms?: boolean
  ): Promise<AuthResponse> => {
    return post<AuthResponse>("/api/auth/google", { token, acceptedTerms });
  },

  // Logout user
  logout: async (): Promise<{ success: boolean }> => {
    return post<{ success: boolean }>("/api/logout", {});
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    return get<User>("/api/me");
  },

  // Update user profile
  updateProfile: async (formData: FormData): Promise<{ user: User }> => {
    return upload<{ user: User }>("/api/me/profile", formData, "PUT");
  },

  // Delete user account
  deleteAccount: async (): Promise<{ success: boolean }> => {
    return del<{ success: boolean }>("/api/me");
  },

  // Become a provider
  becomeProvider: async (
    acceptedProviderTerms: boolean
  ): Promise<{ success: boolean; isProvider: boolean }> => {
    return post("/api/become-provider", { acceptedProviderTerms });
  },

  // Resend verification email
  resendVerification: async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    return post("/api/resend-verification", { email });
  },
};
