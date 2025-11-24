import { get, put, del, upload } from "./api";
// Removed import { Service, Review } from "./servicesService"; to fix module not found error

// Redefine types to avoid circular dependencies if servicesService imports userService (it doesn't, but good practice)
// Actually, I can just define the ProviderProfile interface here.

export interface ProviderProfile {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
  services: any[]; // Simplified
  reviews: any[]; // Simplified
  averageRating: number;
  reviewCount: number;
}

export const userService = {
  // Update profile
  updateProfile: async (
    formData: FormData
  ): Promise<{ success: boolean; user: any }> => {
    return upload<{ success: boolean; user: any }>(
      "/api/me/profile",
      formData,
      "PUT"
    );
  },

  // Get public provider profile
  getProviderProfile: async (providerId: string): Promise<ProviderProfile> => {
    return get<ProviderProfile>(`/api/providers/${providerId}`);
  },

  // Delete account
  deleteAccount: async (): Promise<{ success: boolean }> => {
    return del<{ success: boolean }>("/api/me");
  },
};
