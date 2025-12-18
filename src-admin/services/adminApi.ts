import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_URL}/api/admin`,
  withCredentials: true,
});

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  userType: string;
  isClient: boolean;
  isProvider: boolean;
  isAdmin: boolean;
  adminLevel?: "super" | "standard" | null;
  isBlocked: boolean;
  createdAt: string;
  servicesCount?: number;
  bookingsCount?: number;
}

export interface AdminService {
  id: string;
  providerId: string;
  providerEmail: string;
  title: string;
  description: string;
  price: number;
  category?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  bookingsCount?: number;
}

export interface AdminBooking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  clientId: string;
  clientEmail: string;
  providerId: string;
  providerEmail: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: string;
  paymentStatus: string;
  amount: number;
  createdAt: string;
}

export interface Stats {
  totalUsers: number;
  totalServices: number;
  totalBookings: number;
  totalRevenue: number;
  newUsersToday: number;
  pendingBookings: number;
  activeProviders: number;
  completedBookings: number;
}

export interface AdminDispute {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceCategory?: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  providerId: string;
  providerEmail: string;
  providerName: string;
  date: string;
  amount: number;
  status: string;
  paymentStatus: string;
  photoProof?: string;
  photoProofs: string[];
  disputeStatus: string;
  disputeReason: string;
  disputeOpenedAt: string;
  disputeResolvedAt?: string;
  disputeResolvedBy?: string;
  disputeNotes?: string;
  createdAt: string;
}

export interface AdminDisputeDetails extends AdminDispute {
  client: {
    id: string;
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  provider: {
    id: string;
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  service: {
    id: string;
    title: string;
    description: string;
    price: number;
    category?: string;
  };
  messages: Array<{
    id: string;
    senderId: string;
    senderEmail: string;
    senderType: string;
    message: string;
    createdAt: string;
  }>;
}

export interface RecentActivity {
  id: string;
  type: "booking" | "user" | "service";
  message: string;
  timestamp: string;
}

export const adminApi = {
  // Stats
  async getStats(): Promise<Stats> {
    const response = await api.get<Stats>("/stats");
    return response.data;
  },

  async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      const response = await api.get<RecentActivity[]>("/activity");
      return response.data;
    } catch {
      // If endpoint doesn't exist yet, return empty
      return [];
    }
  },

  // Users
  async getUsers(): Promise<AdminUser[]> {
    const response = await api.get<AdminUser[]>("/users");
    return response.data;
  },

  async toggleUserBlock(
    userId: string,
    isCurrentlyBlocked: boolean
  ): Promise<void> {
    await api.put(`/users/${userId}/block`, { block: !isCurrentlyBlocked });
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}`);
  },

  // Services
  async getServices(): Promise<AdminService[]> {
    const response = await api.get<AdminService[]>("/services");
    return response.data;
  },

  async deleteService(serviceId: string): Promise<void> {
    await api.delete(`/services/${serviceId}`);
  },

  async toggleServiceActive(
    serviceId: string,
    isActive: boolean
  ): Promise<void> {
    await api.put(`/services/${serviceId}/toggle`, { isActive: !isActive });
  },

  // Bookings
  async getBookings(): Promise<AdminBooking[]> {
    const response = await api.get<AdminBooking[]>("/bookings");
    return response.data;
  },

  async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    await api.put(`/bookings/${bookingId}/status`, { status });
  },

  async refundBooking(bookingId: string): Promise<void> {
    await api.post(`/bookings/${bookingId}/refund`);
  },

  // ============ SUPER ADMIN ONLY ============

  async getAdmins(): Promise<AdminUser[]> {
    const response = await api.get<AdminUser[]>("/admins");
    return response.data;
  },

  async promoteToAdmin(userId: string): Promise<void> {
    await api.post(`/users/${userId}/promote`);
  },

  async demoteAdmin(userId: string): Promise<void> {
    await api.post(`/users/${userId}/demote`);
  },

  // ============ DISPUTE MANAGEMENT ============

  async getDisputes(status?: string): Promise<AdminDispute[]> {
    const params = status && status !== "all" ? `?status=${status}` : "";
    const response = await api.get<AdminDispute[]>(`/disputes${params}`);
    return response.data;
  },

  async getDisputeDetails(disputeId: string): Promise<AdminDisputeDetails> {
    const response = await api.get<AdminDisputeDetails>(
      `/disputes/${disputeId}`
    );
    return response.data;
  },

  async resolveDispute(
    disputeId: string,
    resolution: "refund" | "release",
    notes: string
  ): Promise<void> {
    await api.post(`/disputes/${disputeId}/resolve`, { resolution, notes });
  },
};
