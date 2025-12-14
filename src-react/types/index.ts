/**
 * Barrel file per esportare tutti i tipi
 * Import: import { Booking, Service, User, ChatMessage } from '../types';
 */

// Booking types
export type {
  Booking,
  BookingStatus,
  PaymentStatus,
  CreateBookingData,
  BookingWithService,
} from "./booking";

// Service types
export type { Service, ExtraService, ServiceWithProvider } from "./service";

// User types
export type {
  User,
  UserType,
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from "./user";

// Chat types
export type { ChatMessage, Conversation } from "./chat";

// Provider types (re-export existing)
export type { Review } from "./provider";
