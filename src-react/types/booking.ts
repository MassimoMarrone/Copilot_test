/**
 * Tipi unificati per Booking
 * Usare questa definizione in tutto il frontend invece di duplicarla
 */

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type PaymentStatus =
  | "unpaid"
  | "authorized"
  | "held_in_escrow"
  | "released"
  | "refunded";

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
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  photoProof?: string;
  photoProofs?: string; // JSON array di URL (1-10)
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
  hasReview?: boolean;
  createdAt?: string;
  // Smart booking fields
  squareMetersRange?: string;
  windowsCount?: number;
  estimatedDuration?: number;
  startTime?: string;
  endTime?: string;
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

export interface BookingWithService extends Booking {
  service?: {
    title: string;
    description: string;
    price: number;
    imageUrl?: string;
  };
}
