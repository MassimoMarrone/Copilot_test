import { get, post, upload } from "./api";

export interface Booking {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  serviceTitle: string;
  date: string;
  amount: number;
  providerEmail: string;
  clientEmail: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus:
    | "unpaid"
    | "authorized"
    | "held_in_escrow"
    | "released"
    | "refunded";
  photoProof?: string;
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
  hasReview?: boolean;
}

export interface CreateBookingData {
  serviceId: string;
  date: string;
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
}

export const bookingService = {
  // Create a booking
  createBooking: async (
    data: CreateBookingData
  ): Promise<{ id: string; url: string }> => {
    return post<{ id: string; url: string }>("/api/bookings", data);
  },

  // Get client's bookings
  getMyBookings: async (): Promise<Booking[]> => {
    return get<Booking[]>("/api/my-bookings");
  },

  // Get provider's bookings
  getProviderBookings: async (): Promise<Booking[]> => {
    return get<Booking[]>("/api/provider-bookings");
  },

  // Cancel a booking
  cancelBooking: async (id: string): Promise<Booking> => {
    return post<Booking>(`/api/bookings/${id}/cancel`, {});
  },

  // Complete a booking (Provider)
  completeBooking: async (id: string, photoProof: File): Promise<Booking> => {
    const formData = new FormData();
    formData.append("photo", photoProof);
    return upload<Booking>(`/api/bookings/${id}/complete`, formData, "POST");
  },

  // Verify payment
  verifyPayment: async (sessionId: string): Promise<{ success: boolean }> => {
    return get<{ success: boolean }>(
      `/api/verify-payment?session_id=${sessionId}`
    );
  },

  // Create checkout session for existing booking (retry payment)
  createCheckoutSession: async (
    bookingId: string
  ): Promise<{ url: string }> => {
    return post<{ url: string }>("/api/create-checkout-session", { bookingId });
  },
};
