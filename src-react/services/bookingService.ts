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
  status:
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "awaiting_confirmation"
    | "disputed";
  paymentStatus:
    | "unpaid"
    | "authorized"
    | "held_in_escrow"
    | "released"
    | "refunded";
  photoProof?: string;
  photoProofs?: string; // JSON array of photo URLs
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
  hasReview?: boolean;
  // Smart booking fields
  squareMetersRange?: string;
  windowsCount?: number;
  estimatedDuration?: number;
  startTime?: string;
  endTime?: string;
  // Escrow confirmation fields
  awaitingClientConfirmation?: boolean;
  confirmationDeadline?: string;
  clientConfirmedAt?: string;
  // Dispute fields
  disputeStatus?: "pending" | "resolved_refund" | "resolved_payment";
  disputeReason?: string;
}

export interface CreateBookingData {
  serviceId: string;
  date: string;
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
  // Smart booking fields
  squareMetersRange?: string;
  windowsCount?: number;
  estimatedDuration?: number;
  startTime?: string;
  endTime?: string;
  // Selected extras
  selectedExtras?: { name: string; price: number }[];
}

export const bookingService = {
  // Create a booking
  createBooking: async (
    data: CreateBookingData
  ): Promise<{ id: string; url: string }> => {
    return post<{ id: string; url: string }>("/api/bookings", data);
  },

  // Get client's bookings
  getMyBookings: async (page: number = 1): Promise<Booking[]> => {
    return get<Booking[]>(`/api/my-bookings?page=${page}&limit=10`);
  },

  // Get provider's bookings
  getProviderBookings: async (): Promise<Booking[]> => {
    return get<Booking[]>("/api/provider-bookings");
  },

  // Cancel a booking
  cancelBooking: async (id: string): Promise<Booking> => {
    return post<Booking>(`/api/bookings/${id}/cancel`, {});
  },

  // Complete a booking (Provider) - Upload 1-10 photos
  completeBooking: async (id: string, photos: File[]): Promise<Booking> => {
    const formData = new FormData();
    photos.forEach((photo) => {
      formData.append("photos", photo);
    });
    return upload<Booking>(`/api/bookings/${id}/complete`, formData, "POST");
  },

  // Confirm service completion (Client) - Releases payment to provider
  confirmServiceCompletion: async (id: string): Promise<Booking> => {
    return post<Booking>(`/api/bookings/${id}/confirm`, {});
  },

  // Open dispute (Client) - Blocks payment, notifies admin
  openDispute: async (id: string, reason: string): Promise<Booking> => {
    return post<Booking>(`/api/bookings/${id}/dispute`, { reason });
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
