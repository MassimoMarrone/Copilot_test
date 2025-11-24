/**
 * Type definitions for the application
 */

export interface User {
  id: string;
  email: string;
  password: string;
  userType: "client" | "provider" | "admin"; // Kept for backward compatibility, use isClient/isProvider for new logic
  isClient: boolean; // All users start as clients
  isProvider: boolean; // Can become provider by accepting provider terms
  isAdmin?: boolean; // Admin flag
  isBlocked?: boolean; // Blocked flag
  acceptedTerms: boolean; // Client terms
  acceptedProviderTerms?: boolean; // Provider terms (if isProvider is true)
  stripeAccountId?: string; // Stripe Connect Account ID for payouts
  googleId?: string; // Google ID for OAuth users
  createdAt: string;
  // availability?: ProviderAvailability; // Moved to Service
}

export interface Service {
  id: string;
  providerId: string;
  providerEmail: string;
  title: string;
  description: string;
  category?: string;
  price: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  createdAt: string;
  averageRating?: number;
  reviewCount?: number;
  availability?: ProviderAvailability; // Availability is now per service
}

export interface Booking {
  id: string;
  serviceId: string;
  clientId: string;
  clientEmail: string;
  providerId: string;
  providerEmail: string;
  serviceTitle: string;
  amount: number;
  date: string;
  status: "pending" | "completed" | "cancelled";
  paymentStatus:
    | "unpaid"
    | "authorized"
    | "held_in_escrow"
    | "released"
    | "cancelled"
    | "refunded";
  paymentIntentId?: string; // To capture the payment later
  photoProof: string | null;
  createdAt: string;
  completedAt?: string;
  // Additional booking details
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  serviceId: string;
  providerId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
  providerReply?: string;
  providerReplyCreatedAt?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderEmail: string;
  senderType: "client" | "provider" | "admin";
  message: string;
  read?: boolean; // New field for read status
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string; // Optional link to redirect user (e.g. to booking details)
}

export interface TimeSlot {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface ProviderAvailability {
  weekly: WeeklySchedule;
  blockedDates: string[]; // ISO date strings YYYY-MM-DD
}

export interface JWTPayload {
  id: string;
  email: string;
  userType: "client" | "provider" | "admin";
  isAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
