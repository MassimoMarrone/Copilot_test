/**
 * Type definitions for the application
 */

export interface User {
  id: string;
  email: string;
  password: string;
  userType: 'client' | 'provider'; // Kept for backward compatibility, use isClient/isProvider for new logic
  isClient: boolean; // All users start as clients
  isProvider: boolean; // Can become provider by accepting provider terms
  acceptedTerms: boolean; // Client terms
  acceptedProviderTerms?: boolean; // Provider terms (if isProvider is true)
  createdAt: string;
}

export interface Service {
  id: string;
  providerId: string;
  providerEmail: string;
  title: string;
  description: string;
  price: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
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
  status: 'pending' | 'completed' | 'cancelled';
  paymentStatus: 'held_in_escrow' | 'released' | 'cancelled';
  photoProof: string | null;
  createdAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderEmail: string;
  senderType: 'client' | 'provider';
  message: string;
  createdAt: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  userType: 'client' | 'provider';
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
