import { get, post, put, del } from "./api";

export interface AdminStats {
  totalUsers: number;
  totalServices: number;
  totalBookings: number;
  totalRevenue: number;
}

export interface AdminUser {
  id: string;
  email: string;
  userType: string;
  isProvider: boolean;
  isAdmin: boolean;
  createdAt: string;
  isBlocked?: boolean;
}

export const adminService = {
  // Get all users
  getUsers: async (): Promise<AdminUser[]> => {
    return get<AdminUser[]>("/api/admin/users");
  },

  // Get all services
  getServices: async (): Promise<any[]> => {
    return get<any[]>("/api/admin/services");
  },

  // Get all bookings
  getBookings: async (): Promise<any[]> => {
    return get<any[]>("/api/admin/bookings");
  },

  // Get system stats
  getStats: async (): Promise<AdminStats> => {
    return get<AdminStats>("/api/admin/stats");
  },

  // Block/Unblock user
  toggleUserBlock: async (
    userId: string,
    isBlocked: boolean
  ): Promise<{ success: boolean }> => {
    const action = isBlocked ? "unblock" : "block";
    return post<{ success: boolean }>(
      `/api/admin/users/${userId}/${action}`,
      {}
    );
  },

  // Delete user
  deleteUser: async (userId: string): Promise<{ success: boolean }> => {
    return del<{ success: boolean }>(`/api/admin/users/${userId}`);
  },

  // Delete service
  deleteService: async (serviceId: string): Promise<{ success: boolean }> => {
    return del<{ success: boolean }>(`/api/admin/services/${serviceId}`);
  },

  // Cancel booking
  cancelBooking: async (bookingId: string): Promise<{ success: boolean }> => {
    return post<{ success: boolean }>(
      `/api/admin/bookings/${bookingId}/cancel`,
      {}
    );
  },

  // Delete booking
  deleteBooking: async (bookingId: string): Promise<{ success: boolean }> => {
    return del<{ success: boolean }>(`/api/admin/bookings/${bookingId}`);
  },
};
